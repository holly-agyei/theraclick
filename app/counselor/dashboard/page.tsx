"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Users,
  MessageCircle,
  Calendar,
  Clock,
  ChevronRight,
  Mail,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BookingRequest {
  id: string;
  studentId: string;
  studentName: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status: "pending" | "approved" | "rejected" | "confirmed";
  topic?: string;
}

interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export default function CounselorDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeChats: 0,
    todaySessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    async function loadData() {
      if (!profile || !db) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", profile.uid));
        if (userDoc.exists()) {
          setIsAvailable(userDoc.data().isAvailable !== false);
        }

        const conversationsList: Conversation[] = [];
        const conversationsSnap = await getDocs(collection(db, "directMessages"));

        for (const convDoc of conversationsSnap.docs) {
          const chatId = convDoc.id;
          const [uid1, uid2] = chatId.split("_");

          if (uid1 === profile.uid || uid2 === profile.uid) {
            const studentId = uid1 === profile.uid ? uid2 : uid1;
            const studentDoc = await getDoc(doc(db, "users", studentId));
            const studentData = studentDoc.exists() ? studentDoc.data() : null;

            if (studentData?.role === "student") {
              const messagesRef = collection(db, "directMessages", chatId, "messages");
              const lastMsgSnap = await getDocs(query(messagesRef, orderBy("createdAt", "desc"), limit(1)));
              const lastMsg = lastMsgSnap.empty ? null : lastMsgSnap.docs[0].data();

              conversationsList.push({
                studentId,
                studentName: studentData?.anonymousEnabled && studentData?.anonymousId
                  ? studentData.anonymousId
                  : studentData?.fullName || "Student",
                lastMessage: lastMsg?.text?.slice(0, 60),
                lastMessageTime: lastMsg?.createdAt?.toDate(),
              });
            }
          }
        }

        conversationsList.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
        setConversations(conversationsList);

        const bookingsRef = collection(db, "bookings");
        const bookingsSnap = await getDocs(query(bookingsRef, where("counselorId", "==", profile.uid), orderBy("date", "asc")));
        const bookingsList: BookingRequest[] = [];
        const today = new Date().toISOString().split("T")[0];
        let todayCount = 0;

        for (const bookingDoc of bookingsSnap.docs) {
          const data = bookingDoc.data();
          const bookingDate = new Date(`${data.date}T${data.endTime}`);
          if (bookingDate > new Date() && data.status === "confirmed") {
            const studentDoc = await getDoc(doc(db, "users", data.studentId));
            const studentData = studentDoc.exists() ? studentDoc.data() : null;

            bookingsList.push({
              id: bookingDoc.id,
              studentId: data.studentId,
              studentName: studentData?.anonymousEnabled && studentData?.anonymousId
                ? studentData.anonymousId
                : studentData?.fullName || "Student",
              date: data.date,
              startTime: data.startTime,
              endTime: data.endTime,
              status: data.status || "confirmed",
              topic: data.topic || undefined,
            });

            if (data.date === today) todayCount++;
          }
        }
        setBookingRequests(bookingsList);

        setStats({
          totalStudents: conversationsList.length,
          activeChats: conversationsList.filter(c => c.lastMessageTime &&
            Date.now() - c.lastMessageTime.getTime() < 7 * 24 * 60 * 60 * 1000).length,
          todaySessions: todayCount,
        });
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [profile]);

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

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-8 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {stats.todaySessions > 0
                    ? `${stats.todaySessions} session${stats.todaySessions > 1 ? "s" : ""} today`
                    : "No sessions today"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAvailability}
                  disabled={togglingAvailability}
                  className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {isAvailable ? (
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                  <span className={`text-xs font-medium ${isAvailable ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayFormatted}
                </span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800">
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">Students</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loading ? "--" : stats.totalStudents}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">Active Chats</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loading ? "--" : stats.activeChats}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Sessions</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {loading ? "--" : stats.todaySessions}
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming sessions</h2>
                <button
                  onClick={() => router.push("/counselor/bookings")}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  All bookings
                </button>
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : bookingRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-800 py-10 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming sessions</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {bookingRequests.slice(0, 3).map((booking) => {
                    const bookingDate = new Date(`${booking.date}T${booking.startTime}`);
                    const isToday = booking.date === new Date().toISOString().split("T")[0];
                    return (
                      <button
                        key={booking.id}
                        onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                        className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-green-50/40 dark:bg-green-950/40 p-5 text-left transition-all hover:border-green-300 hover:shadow-sm"
                      >
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{booking.studentName}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {booking.startTime} - {booking.endTime}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-400">
                          {bookingDate.toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                          })}
                        </p>
                        {booking.topic && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-400">{booking.topic}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                            {booking.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          {isToday && (
                            <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                              Today
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Conversations Table */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent conversations</h2>
                <button
                  onClick={() => router.push("/counselor/inbox")}
                  className="inline-flex items-center gap-1 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400 transition-colors hover:bg-green-100 dark:hover:bg-green-900"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-800 py-10 text-center">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-400">Students will reach out to you here</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Name
                        </th>
                        <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400 sm:table-cell">
                          Last Message
                        </th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {conversations.slice(0, 5).map((conv) => (
                        <tr
                          key={conv.studentId}
                          onClick={() => router.push(`/counselor/inbox/${conv.studentId}`)}
                          className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-bold text-blue-600">
                                {conv.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{conv.studentName}</span>
                            </div>
                          </td>
                          <td className="hidden max-w-[200px] truncate px-5 py-3.5 text-gray-500 dark:text-gray-400 sm:table-cell">
                            {conv.lastMessage || "No messages"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-gray-400 dark:text-gray-400">
                            {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => router.push("/counselor/students")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Users className="h-5 w-5 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">All Students</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View and manage</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                </button>
                <button
                  onClick={() => router.push("/counselor/inbox")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Mail className="h-5 w-5 shrink-0 text-green-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Inbox</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">All conversations</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                </button>
                <button
                  onClick={() => router.push("/counselor/availability")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Calendar className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Availability</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage time slots</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
