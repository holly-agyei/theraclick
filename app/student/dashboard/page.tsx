"use client";

import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Calendar, Clock, ArrowRight, Bell,
  MessageCircle, Brain, Moon, Wind, Flag,
  BookOpen, ChevronRight, Leaf, Heart,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useState, useEffect } from "react";
import {
  collection, query, where, limit, onSnapshot, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportIssueModal } from "@/components/ReportIssueModal";

const insightCards = [
  {
    label: "Breathe",
    title: "60-Second Reset",
    body: "When overwhelmed, try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 3 times.",
    href: null,
    icon: Wind,
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Sleep",
    title: "Your Sleep Score Matters",
    body: "Students who sleep 7+ hours score 10% higher on exams. Quality sleep is a study strategy.",
    href: "https://www.sleepfoundation.org/sleep-hygiene",
    icon: Moon,
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Mindset",
    title: "Reframe Negative Thoughts",
    body: "Replace 'I can't handle this' with 'I'm learning to handle this.' Small shifts, big impact.",
    href: "https://www.verywellmind.com/what-is-cognitive-behavior-therapy-2795747",
    icon: Brain,
    accent: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Connection",
    title: "Reach Out Today",
    body: "Loneliness increases stress hormones by 20%. Even a 5-minute conversation helps.",
    href: null,
    icon: Heart,
    accent: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    label: "Nutrition",
    title: "Brain Food",
    body: "Omega-3s, blueberries, and dark chocolate boost focus and reduce brain fog during study sessions.",
    href: "https://www.health.harvard.edu/mind-and-mood/foods-linked-to-better-brainpower",
    icon: Leaf,
    accent: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    label: "Mindfulness",
    title: "5-Minute Body Scan",
    body: "A 5-minute body scan reduces stress perception by 23%, even during exams.",
    href: null,
    icon: Wind,
    accent: "text-teal-600",
    bg: "bg-teal-50",
  },
];

interface UpcomingBooking {
  id: string;
  counselorName: string;
  date: string;
  startTime: string;
  endTime: string;
}
interface RecentConversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  type: "counselor" | "peer-mentor";
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const firstName =
    profile?.role === "student" && profile.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : profile?.fullName?.split(" ")[0] || null;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    if (!profile || !db) { setLoadingBookings(false); return; }

    const q = query(
      collection(db, "bookings"),
      where("studentId", "==", profile.uid),
      where("status", "==", "confirmed"),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      const bookings: UpcomingBooking[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        const bookingDate = new Date(`${data.date}T${data.startTime}`);
        if (bookingDate > new Date()) {
          bookings.push({
            id: d.id,
            counselorName: data.counselorName || "Counselor",
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          });
        }
      });
      bookings.sort((a, b) =>
        new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      );
      setUpcomingBookings(bookings.slice(0, 3));
      setLoadingBookings(false);
    }, () => setLoadingBookings(false));

    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile || !db) { setLoadingConversations(false); return; }

    const unsub = onSnapshot(collection(db, "directMessages"), async (snap) => {
      const list: RecentConversation[] = [];
      for (const convDoc of snap.docs) {
        const data = convDoc.data();
        const participants = data.participants as string[] | undefined;
        if (participants?.includes(profile.uid) && db) {
          const otherUserId = participants.find((p) => p !== profile.uid);
          if (otherUserId) {
            try {
              const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
              if (otherUserDoc.exists()) {
                const u = otherUserDoc.data();
                if (u.role === "counselor" || u.role === "peer-mentor") {
                  list.push({
                    id: otherUserId,
                    name: u.fullName || "Unknown",
                    lastMessage: data.lastMessage?.slice(0, 50) || "No messages yet",
                    lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
                    type: u.role === "counselor" ? "counselor" : "peer-mentor",
                  });
                }
              }
            } catch { /* ignore */ }
          }
        }
      }
      list.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      setRecentConversations(list.slice(0, 5));
      setLoadingConversations(false);
    }, () => setLoadingConversations(false));

    return () => unsub();
  }, [profile]);

  const formatBookingDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  };

  const formatConvTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white">
        <div className="px-4 py-8 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard
                </h1>
                {firstName && (
                  <p className="mt-1 text-sm text-gray-500">
                    Welcome back, {firstName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayFormatted}
                </span>
                <button
                  onClick={() => router.push("/student/inbox")}
                  className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
                  aria-label="Inbox"
                >
                  <Bell className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white">
              <div className="grid grid-cols-2 divide-x divide-gray-200 md:grid-cols-4">
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Upcoming Sessions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loadingBookings ? "--" : upcomingBookings.length}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Conversations
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loadingConversations ? "--" : recentConversations.length}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Counselors
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loadingConversations
                      ? "--"
                      : recentConversations.filter((c) => c.type === "counselor").length}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Peer Mentors
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loadingConversations
                      ? "--"
                      : recentConversations.filter((c) => c.type === "peer-mentor").length}
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming sessions</h2>
                <button
                  onClick={() => router.push("/student/bookings")}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  All bookings
                </button>
              </div>

              {loadingBookings ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No upcoming sessions</p>
                  <button
                    onClick={() => router.push("/student/counselors")}
                    className="mt-3 text-sm font-medium text-green-600 hover:underline"
                  >
                    Book a session
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {upcomingBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => router.push("/student/bookings")}
                      className="group rounded-xl border border-gray-200 bg-green-50/40 p-5 text-left transition-all hover:border-green-300 hover:shadow-sm"
                    >
                      <p className="text-lg font-semibold text-gray-900">
                        {booking.counselorName}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {booking.startTime} - {booking.endTime}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatBookingDate(booking.date, booking.startTime)}
                      </p>
                      <div className="mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                        {booking.counselorName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations Table */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent conversations</h2>
                <button
                  onClick={() => router.push("/student/inbox")}
                  className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  View All
                </button>
              </div>

              {loadingConversations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Start chatting with a counselor or peer mentor
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Name
                        </th>
                        <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
                          Last Message
                        </th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Time
                        </th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentConversations.map((conv) => (
                        <tr
                          key={conv.id}
                          onClick={() =>
                            router.push(
                              conv.type === "counselor"
                                ? `/student/counselors/${conv.id}`
                                : `/student/peer-mentors/${conv.id}`
                            )
                          }
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                                  conv.type === "counselor" ? "bg-blue-500" : "bg-green-500"
                                }`}
                              >
                                {conv.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium text-gray-900">{conv.name}</span>
                            </div>
                          </td>
                          <td className="hidden max-w-[200px] truncate px-5 py-3.5 text-gray-500 sm:table-cell">
                            {conv.lastMessage}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-gray-400">
                            {formatConvTime(conv.lastMessageTime)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                conv.type === "counselor"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-green-50 text-green-600"
                              }`}
                            >
                              {conv.type === "counselor" ? "Counselor" : "Peer Mentor"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Wellness Tips Grid */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Wellness tips</h2>
                <a
                  href="https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  Resources <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {insightCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="rounded-xl border border-gray-200 p-5 transition-colors hover:bg-gray-50"
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                          <Icon className={`h-4 w-4 ${card.accent}`} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {card.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{card.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500">{card.body}</p>
                      {card.href && (
                        <a
                          href={card.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                        >
                          Read more <ChevronRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Reads */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick reads</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href="https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-green-600">
                      Mental Health: Facts & Figures
                    </p>
                    <p className="text-xs text-gray-500">WHO Report</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-green-600" />
                </a>
                <a
                  href="https://www.headspace.com/meditation/meditation-for-beginners"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Wind className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      Meditation for Beginners
                    </p>
                    <p className="text-xs text-gray-500">Headspace</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue-600" />
                </a>
              </div>
            </div>

            {/* Report Issue */}
            <div className="text-center">
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-500 transition-colors hover:border-red-200 hover:text-red-500"
              >
                <Flag className="h-3 w-3" />
                Report an issue
              </button>
            </div>

          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportIssueModal onClose={() => setShowReportModal(false)} />
      )}
    </LayoutWrapper>
  );
}
