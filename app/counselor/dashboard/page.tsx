"use client";

/**
 * COUNSELOR DASHBOARD — Dr. Mensah's home view.
 * Shows today's sessions, pending requests, availability toggle, recent conversations.
 * No emojis. Clean, professional but warm.
 */

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

  const firstName = profile?.fullName?.split(" ")[0] || "Dr.";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    async function loadData() {
      if (!profile || !db) {
        setLoading(false);
        return;
      }

      try {
        // Check current availability status
        const userDoc = await getDoc(doc(db, "users", profile.uid));
        if (userDoc.exists()) {
          setIsAvailable(userDoc.data().isAvailable !== false);
        }

        // Load conversations
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

        // Load upcoming bookings
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

            const booking: BookingRequest = {
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
            };
            bookingsList.push(booking);

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
      <div className="min-h-screen bg-[#F0FDF4]">
        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {greeting}, {firstName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {stats.todaySessions > 0
                  ? `You have ${stats.todaySessions} session${stats.todaySessions > 1 ? "s" : ""} today`
                  : "No sessions scheduled for today"
                }
              </p>
            </div>

            {/* Availability Toggle */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Your availability</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {isAvailable
                      ? "Students can see you are available right now"
                      : "You are currently set as unavailable"
                    }
                  </p>
                </div>
                <button
                  onClick={toggleAvailability}
                  disabled={togglingAvailability}
                  className="flex items-center gap-2 transition-all"
                >
                  {isAvailable ? (
                    <ToggleRight className="h-8 w-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-500" />
                  )}
                  <span className={`text-sm font-medium ${isAvailable ? "text-green-600" : "text-gray-500"}`}>
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-3 grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Students</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Active chats</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.activeChats}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">Today</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stats.todaySessions}</p>
              </div>
            </div>

            {/* Today's Sessions */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Upcoming sessions</h2>
                <button
                  onClick={() => router.push("/counselor/bookings")}
                  className="text-xs text-green-600 hover:text-green-500"
                >
                  View all
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white animate-pulse" />
                  ))}
                </div>
              ) : bookingRequests.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">No upcoming sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingRequests.slice(0, 5).map((booking) => {
                    const bookingDate = new Date(`${booking.date}T${booking.startTime}`);
                    const isToday = booking.date === new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={booking.id}
                        className={`rounded-xl border p-4 transition-all
                          ${isToday
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-white"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full
                              text-sm font-bold
                              ${isToday ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-900"}`}>
                              {booking.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{booking.studentName}</p>
                              <p className="text-xs text-gray-500">
                                {bookingDate.toLocaleDateString("en-US", {
                                  weekday: "short", month: "short", day: "numeric",
                                })} at {booking.startTime} - {booking.endTime}
                              </p>
                              {booking.topic && (
                                <p className="mt-0.5 text-xs text-gray-400">{booking.topic}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                            className="rounded-full bg-green-600 px-4 py-2 text-xs font-medium text-white
                              transition-all hover:bg-green-700 active:scale-[0.95]"
                          >
                            {isToday ? "Start Session" : "Chat"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => router.push("/counselor/students")}
                className="flex items-center gap-3 rounded-2xl border border-gray-200
                  bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-100"
              >
                <Users className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">All Students</p>
                  <p className="text-xs text-gray-500">View and manage</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/counselor/inbox")}
                className="flex items-center gap-3 rounded-2xl border border-gray-200
                  bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-100"
              >
                <Mail className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Inbox</p>
                  <p className="text-xs text-gray-500">All conversations</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/counselor/availability")}
                className="flex items-center gap-3 rounded-2xl border border-gray-200
                  bg-white p-4 text-left transition-all hover:border-gray-300 hover:bg-gray-100"
              >
                <Calendar className="h-5 w-5 text-[#F5C842] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Availability</p>
                  <p className="text-xs text-gray-500">Manage time slots</p>
                </div>
              </button>
            </div>

            {/* Recent Conversations */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recent conversations</h2>
                <button
                  onClick={() => router.push("/counselor/inbox")}
                  className="text-xs text-green-600 hover:text-green-500"
                >
                  View all
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl border border-gray-200 bg-white animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="mt-1 text-xs text-gray-400">Students will reach out to you here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 5).map((conv) => (
                    <button
                      key={conv.studentId}
                      onClick={() => router.push(`/counselor/inbox/${conv.studentId}`)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200
                        bg-white p-3 text-left transition-all hover:border-green-200"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                        bg-blue-100 text-sm font-bold text-blue-600">
                        {conv.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">{conv.studentName}</span>
                          {conv.lastMessageTime && (
                            <span className="ml-2 shrink-0 text-[10px] text-gray-500">{formatTime(conv.lastMessageTime)}</span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">{conv.lastMessage}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
