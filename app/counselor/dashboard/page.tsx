"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Users, MessageCircle, Calendar, Clock, ChevronRight, Mail,
  ToggleLeft, ToggleRight, AlertCircle, CalendarDays, Star,
  CheckCircle, XCircle, Video, Phone, Bell, UserPlus, BookOpen,
} from "lucide-react";
import { collection, getDocs, query, doc, getDoc, where, updateDoc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { notifyBookingConfirmed, notifyBookingDeclined } from "@/lib/notify";

interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "declined";
  message?: string;
  sessionType?: "video" | "voice" | "chat";
}

interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

interface ActivityItem {
  id: string;
  text: string;
  time: Date;
  icon: "booking" | "message" | "student";
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTimeSlot(time?: string) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function CounselorDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  // conversations data used only for stats computation
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [avgRating, setAvgRating] = useState<{ score: number; count: number } | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeChats: 0,
    todaySessions: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
  const firstName = profile?.fullName?.split(" ")[0] || "";

  useEffect(() => {
    async function loadData() {
      if (!profile || !db) { setLoading(false); return; }

      try {
        const userDoc = await getDoc(doc(db, "users", profile.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        if (userData) {
          setIsAvailable(userData.isAvailable !== false);
          const hasSpecialization = !!(userData.application?.specialization || userData.specialization);
          const hasAbout = !!(userData.application?.about || userData.about);
          setProfileComplete(hasSpecialization && hasAbout);
        }

        // Load conversations + activity feed together
        const convQuery = query(collection(db, "directMessages"), where("participants", "array-contains", profile.uid));
        const convSnap = await getDocs(convQuery);
        const conversationsList: Conversation[] = [];
        const activityList: ActivityItem[] = [];
        const seenStudentIds = new Set<string>();

        for (const convDoc of convSnap.docs) {
          const convData = convDoc.data();
          const participants = convData.participants as string[];
          const studentId = participants.find((p: string) => p !== profile.uid);
          if (!studentId || seenStudentIds.has(studentId)) continue;
          seenStudentIds.add(studentId);

          let sName = "Student";
          try {
            const studentDoc = await getDoc(doc(db, "users", studentId));
            const studentData = studentDoc.exists() ? studentDoc.data() : null;
            if (!studentData || studentData.role !== "student") continue;
            sName = studentData.anonymousEnabled && studentData.anonymousId
              ? studentData.anonymousId : studentData.fullName || "Student";
          } catch { continue; }

          // Fetch the last 3 messages from subcollection (used for both conversation table + activity)
          let lastMsg = "";
          let lastMsgTime: Date | undefined;
          try {
            const recentMsgsSnap = await getDocs(
              query(collection(db, "directMessages", convDoc.id, "messages"), orderBy("createdAt", "desc"), limit(3))
            );

            for (let i = 0; i < recentMsgsSnap.docs.length; i++) {
              const msgDoc = recentMsgsSnap.docs[i];
              const msgData = msgDoc.data();
              const msgTime = msgData.createdAt?.toDate();

              // First message = last message for conversation table
              if (i === 0) {
                if (msgData.type === "call") {
                  const callLabel = msgData.callType === "video" ? "Video call" : "Voice call";
                  lastMsg = msgData.callStatus === "missed" ? `${callLabel} · Missed` : callLabel;
                } else {
                  lastMsg = (msgData.text as string)?.slice(0, 60) || (msgData.audioUrl ? "🎤 Voice message" : "");
                }
                lastMsgTime = msgTime;
              }

              // All messages → activity feed
              if (msgTime) {
                activityList.push({
                  id: `msg-${msgDoc.id}`,
                  text: `${msgData.senderId === profile.uid ? "You messaged" : "New message from"} ${sName}`,
                  time: msgTime,
                  icon: "message",
                });
              }
            }
          } catch (err) {
            console.error("Error fetching messages for", convDoc.id, err);
          }

          conversationsList.push({
            studentId,
            studentName: sName,
            lastMessage: lastMsg,
            lastMessageTime: lastMsgTime,
          });
        }

        setStats(prev => ({
          ...prev,
          totalStudents: conversationsList.length,
          activeChats: conversationsList.filter(c => c.lastMessageTime && Date.now() - c.lastMessageTime.getTime() < 7 * 24 * 60 * 60 * 1000).length,
        }));

        // Bookings
        const bookingsRef = collection(db, "bookings");
        const bookingsSnap = await getDocs(query(bookingsRef, where("counselorId", "==", profile.uid)));
        const bookingsList: Booking[] = [];
        const allList: Booking[] = [];
        const bookingActivities: ActivityItem[] = [];
        let pendingCount = 0;
        let todayCount = 0;
        let ratingSum = 0;
        let ratingCount = 0;

        for (const bookingDoc of bookingsSnap.docs) {
          const data = bookingDoc.data();
          if (data.status === "pending") pendingCount++;

          let studentName = data.studentName || "Student";
          let studentEmail = "";
          try {
            const studentDoc = await getDoc(doc(db, "users", data.studentId));
            const sd = studentDoc.data();
            if (sd) {
              studentName = sd.anonymousEnabled && sd.anonymousId ? sd.anonymousId : sd.fullName || studentName;
              studentEmail = sd.email || "";
            }
          } catch { /* fallback */ }

          const b: Booking = {
            id: bookingDoc.id,
            studentId: data.studentId,
            studentName,
            studentEmail,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            status: data.status || "confirmed",
            message: data.message,
            sessionType: data.sessionType,
          };
          allList.push(b);

          if (data.review?.rating) {
            ratingSum += data.review.rating;
            ratingCount++;
          }

          const bookingEnd = new Date(`${data.date}T${data.endTime || data.startTime}`);
          if (bookingEnd > new Date() && (data.status === "confirmed" || data.status === "pending")) {
            bookingsList.push(b);
            if (data.date === todayStr && data.status === "confirmed") todayCount++;
          }

          if (data.createdAt?.toDate()) {
            bookingActivities.push({
              id: `book-${bookingDoc.id}`,
              text: `${studentName} ${data.status === "pending" ? "requested" : "booked"} a session for ${data.date || "—"}`,
              time: data.createdAt.toDate(),
              icon: "booking",
            });
          }
        }

        bookingsList.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
        setBookings(bookingsList);
        setAllBookings(allList);
        if (ratingCount > 0) setAvgRating({ score: ratingSum / ratingCount, count: ratingCount });

        const allActivities = [...activityList, ...bookingActivities];
        allActivities.sort((a, b) => b.time.getTime() - a.time.getTime());
        setActivities(allActivities.slice(0, 6));

        setStats(prev => ({
          ...prev,
          todaySessions: todayCount,
          pendingRequests: pendingCount,
        }));
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [profile, todayStr]);

  const toggleAvailability = async () => {
    if (!profile || !db) return;
    setTogglingAvailability(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { isAvailable: !isAvailable });
      setIsAvailable(!isAvailable);
    } catch (e) {
      console.error("Error toggling availability:", e);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleAccept = async (b: Booking) => {
    if (!db) return;
    setActionLoading(b.id);
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "confirmed" });
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "confirmed" } : x));
      setAllBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "confirmed" } : x));
      const isToday = b.date === todayStr;
      setStats(prev => ({
        ...prev,
        pendingRequests: prev.pendingRequests - 1,
        ...(isToday ? { todaySessions: prev.todaySessions + 1 } : {}),
      }));
      if (b.studentEmail) {
        const appUrl = window.location.origin;
        notifyBookingConfirmed(b.studentId, b.studentEmail, b.studentName,
          profile?.fullName || "", `${b.date} at ${formatTimeSlot(b.startTime)}`, appUrl);
      }
    } catch { alert("Failed to accept"); }
    finally { setActionLoading(null); }
  };

  const handleDecline = async (b: Booking) => {
    if (!db || !confirm("Decline this request?")) return;
    setActionLoading(b.id);
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "declined" });
      setBookings(prev => prev.filter(x => x.id !== b.id));
      setAllBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "declined" } : x));
      setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
      if (b.studentEmail) {
        const appUrl = window.location.origin;
        notifyBookingDeclined(b.studentId, b.studentEmail, b.studentName,
          profile?.fullName || "", `${b.date} at ${formatTimeSlot(b.startTime)}`, appUrl);
      }
    } catch { alert("Failed to decline"); }
    finally { setActionLoading(null); }
  };

  // Today's confirmed sessions for timeline
  const todaySessions = bookings.filter(b => b.date === todayStr && b.status === "confirmed")
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const pendingBookings = bookings.filter(b => b.status === "pending");

  // Weekly chart data
  const weekData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const count = allBookings.filter(b =>
        b.date === ds && (b.status === "confirmed" || b.status === "completed")
      ).length;
      days.push({ label, count });
    }
    return days;
  }, [allBookings]);
  const maxWeek = Math.max(...weekData.map(d => d.count), 1);

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-8 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {getGreeting()}, {firstName || "Counselor"}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {loading ? "Loading your schedule..." :
                   stats.todaySessions > 0
                    ? `You have ${stats.todaySessions} session${stats.todaySessions > 1 ? "s" : ""} today`
                    : "Your schedule for today"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <button
                    onClick={toggleAvailability}
                    disabled={togglingAvailability}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors
                      ${isAvailable
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900"
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  >
                    {isAvailable
                      ? <ToggleRight className="h-5 w-5 text-green-600" />
                      : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    <span className={`text-xs font-medium ${isAvailable ? "text-green-600" : "text-gray-500"}`}>
                      {isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </button>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {isAvailable ? "Students can book sessions" : "Hidden from searches"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 px-3 py-1.5 text-xs font-medium text-[#1A7A6E] dark:text-[#2BB5A0]">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayFormatted}
                </span>
              </div>
            </div>

            {/* Profile incomplete banner */}
            {!loading && !profileComplete && (
              <button onClick={() => router.push("/counselor/settings")}
                className="mb-6 flex w-full items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4 text-left transition-all hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Complete your profile</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Add your bio and specializations so students can find and book you</p>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400" />
              </button>
            )}

            {/* Stats Row with icons + colors */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Pending", value: stats.pendingRequests,
                  zero: "No pending requests",
                  icon: <Bell className="h-5 w-5" />,
                  color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50",
                  border: "border-amber-200 dark:border-amber-800",
                  iconBg: "bg-amber-100 dark:bg-amber-900",
                },
                {
                  label: "Students", value: stats.totalStudents,
                  zero: "Add your first student",
                  icon: <Users className="h-5 w-5" />,
                  color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50",
                  border: "border-blue-200 dark:border-blue-800",
                  iconBg: "bg-blue-100 dark:bg-blue-900",
                },
                {
                  label: "Active Chats", value: stats.activeChats,
                  zero: "No active chats",
                  icon: <MessageCircle className="h-5 w-5" />,
                  color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/50",
                  border: "border-green-200 dark:border-green-800",
                  iconBg: "bg-green-100 dark:bg-green-900",
                },
                {
                  label: "Today", value: stats.todaySessions,
                  zero: "Set your availability",
                  zeroAction: () => router.push("/counselor/availability"),
                  icon: <CalendarDays className="h-5 w-5" />,
                  color: "text-[#2BB5A0]", bg: "bg-[#2BB5A0]/5",
                  border: "border-[#2BB5A0]/20",
                  iconBg: "bg-[#2BB5A0]/10",
                },
              ].map((s) => (
                <div key={s.label}
                  onClick={s.value === 0 && s.zeroAction ? s.zeroAction : undefined}
                  className={`rounded-xl border ${s.border} ${s.bg} p-4 ${s.value === 0 && s.zeroAction ? "cursor-pointer hover:shadow-sm" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.iconBg} ${s.color}`}>
                      {s.icon}
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                  </div>
                  {loading ? (
                    <div className="mt-3 h-8 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  ) : s.value > 0 ? (
                    <p className={`mt-3 text-2xl font-bold ${s.color}`}>{s.value}</p>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-gray-400">{s.zero} {s.zeroAction ? "→" : ""}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Pending Requests */}
            {!loading && pendingBookings.length > 0 && (
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <Bell className="h-5 w-5 text-amber-500" /> Pending Requests
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{pendingBookings.length}</span>
                  </h2>
                  <button onClick={() => router.push("/counselor/bookings")}
                    className="text-sm font-medium text-[#2BB5A0] hover:underline">View all</button>
                </div>
                <div className="space-y-3">
                  {pendingBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                            {getInitials(b.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{b.studentName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {b.date ? new Date(`${b.date}T${b.startTime}`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—"}
                              {" · "}{formatTimeSlot(b.startTime)} – {formatTimeSlot(b.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAccept(b)} disabled={actionLoading === b.id}
                            className="flex items-center gap-1 rounded-lg bg-[#0F4F47] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1A7A6E] disabled:opacity-50 active:scale-[0.97]">
                            <CheckCircle className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button onClick={() => handleDecline(b)} disabled={actionLoading === b.id}
                            className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 active:scale-[0.97]">
                            <XCircle className="h-3.5 w-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                      {b.message && (
                        <p className="mt-2 ml-[52px] rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 italic">
                          &ldquo;{b.message}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Schedule */}
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Today&apos;s schedule</h2>
              {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
              ) : todaySessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sessions scheduled for today</p>
                  <button onClick={() => router.push("/counselor/availability")}
                    className="mt-2 text-xs font-semibold text-[#2BB5A0] hover:underline">Set your availability →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaySessions.map((s) => (
                    <button key={s.id} onClick={() => router.push(`/counselor/inbox/${s.studentId}`)}
                      className="flex w-full items-center gap-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-950/20 p-4 text-left transition-all hover:shadow-sm">
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-sm font-bold text-[#0F4F47] dark:text-[#2BB5A0]">{formatTimeSlot(s.startTime)}</p>
                        <p className="text-[10px] text-gray-400">{formatTimeSlot(s.endTime)}</p>
                      </div>
                      <div className="h-10 w-px bg-green-300 dark:bg-green-700" />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2BB5A0] text-xs font-bold text-white">
                        {getInitials(s.studentName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{s.studentName}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          {s.sessionType === "voice" ? <Phone className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                          {s.sessionType === "voice" ? "Voice Call" : "Video Call"} · 50 min
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Two-column: Weekly + Rating / Activity */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              {/* Weekly Overview */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">This week</h3>
                <div className="flex items-end gap-2" style={{ height: 100 }}>
                  {weekData.map((d, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-[#2BB5A0]/20 dark:bg-[#2BB5A0]/10 relative"
                        style={{ height: `${Math.max((d.count / maxWeek) * 80, 4)}px` }}>
                        <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-[#2BB5A0]"
                          style={{ height: `${Math.max((d.count / maxWeek) * 80, 4)}px` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{d.label}</span>
                    </div>
                  ))}
                </div>
                {avgRating && (
                  <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{avgRating.score.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">average · {avgRating.count} review{avgRating.count > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Recent activity</h3>
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Activity will appear here as students interact</p>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          a.icon === "booking" ? "bg-[#2BB5A0]/10 text-[#2BB5A0]" :
                          a.icon === "message" ? "bg-blue-50 dark:bg-blue-950 text-blue-500" :
                          "bg-green-50 dark:bg-green-950 text-green-500"
                        }`}>
                          {a.icon === "booking" ? <Calendar className="h-3.5 w-3.5" /> :
                           a.icon === "message" ? <MessageCircle className="h-3.5 w-3.5" /> :
                           <UserPlus className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 dark:text-gray-300">{a.text}</p>
                          <p className="text-[10px] text-gray-400">{timeAgo(a.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">Quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { href: "/counselor/bookings", icon: <BookOpen className="h-5 w-5" />, label: "Bookings", sub: "Session requests", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
                  { href: "/counselor/students", icon: <Users className="h-5 w-5" />, label: "Students", sub: "View and manage", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
                  { href: "/counselor/inbox", icon: <Mail className="h-5 w-5" />, label: "Inbox", sub: "All conversations", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
                  { href: "/counselor/availability", icon: <Calendar className="h-5 w-5" />, label: "Availability", sub: "Manage time slots", color: "text-[#2BB5A0]", bg: "bg-[#2BB5A0]/10" },
                ].map((a) => (
                  <button key={a.href} onClick={() => router.push(a.href)}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-700">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.bg} ${a.color}`}>
                      {a.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{a.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
