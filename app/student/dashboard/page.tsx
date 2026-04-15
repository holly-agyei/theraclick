"use client";

import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Calendar, Clock, ArrowRight, Bell, Sparkles,
  MessageCircle, Brain, Moon, Wind, Flag,
  BookOpen, ChevronRight, Leaf, Heart,
  Users, UserCheck, CheckCircle, Circle,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useState, useEffect } from "react";
import {
  collection, query, where, limit, getDocs, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportIssueModal } from "@/components/ReportIssueModal";

const moods = [
  { emoji: "😔", label: "Down" },
  { emoji: "😟", label: "Anxious" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😊", label: "Great" },
];

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
  chatId: string;
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
  const [hasEverBooked, setHasEverBooked] = useState(false);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [hasJoinedForum, setHasJoinedForum] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const firstName =
    profile?.role === "student" && profile.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : profile?.fullName?.split(" ")[0] || null;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    if (!profile || !db) { setLoadingBookings(false); return; }
    let mounted = true;
    async function fetchBookings() {
      try {
        const q = query(
          collection(db!, "bookings"),
          where("studentId", "==", profile!.uid),
          limit(20)
        );
        const snap = await getDocs(q);
        if (!mounted) return;
        if (snap.docs.length > 0) setHasEverBooked(true);
        const bookings: UpcomingBooking[] = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.status !== "confirmed") return;
          const bookingDate = new Date(`${data.date}T${data.startTime}`);
          if (bookingDate > new Date()) {
            bookings.push({ id: d.id, counselorName: data.counselorName || "Counselor", date: data.date, startTime: data.startTime, endTime: data.endTime });
          }
        });
        bookings.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
        setUpcomingBookings(bookings.slice(0, 3));
      } catch { /* ignore */ }
      finally { if (mounted) setLoadingBookings(false); }
    }
    void fetchBookings();
    return () => { mounted = false; };
  }, [profile]);

  useEffect(() => {
    if (!profile || !db) { setLoadingConversations(false); return; }
    let mounted = true;
    async function fetchConversations() {
      try {
        const convQuery = query(
          collection(db!, "directMessages"),
          where("participants", "array-contains", profile!.uid)
        );
        const snap = await getDocs(convQuery);
        if (!mounted) return;
        const convMap = new Map<string, { convDoc: typeof snap.docs[0]; data: ReturnType<typeof snap.docs[0]["data"]> }>();
        for (const convDoc of snap.docs) {
          const data = convDoc.data();
          const participants = data.participants as string[];
          const otherUserId = participants.find((p) => p !== profile!.uid);
          if (!otherUserId) continue;
          const existing = convMap.get(otherUserId);
          const thisTime = data.lastMessageTime?.toDate?.()?.getTime() || 0;
          const existTime = existing?.data.lastMessageTime?.toDate?.()?.getTime() || 0;
          if (!existing || thisTime > existTime) {
            convMap.set(otherUserId, { convDoc, data });
          }
        }
        const list: RecentConversation[] = [];
        for (const [otherUserId, { convDoc, data }] of convMap) {
          if (!mounted || !db) break;
          try {
            const otherUserDoc = await getDoc(doc(db!, "users", otherUserId));
            if (!mounted) break;
            if (otherUserDoc.exists()) {
              const u = otherUserDoc.data();
              if (u.role === "counselor" || u.role === "peer-mentor") {
                list.push({ id: otherUserId, chatId: convDoc.id, name: u.fullName || "Unknown", lastMessage: data.lastMessage?.slice(0, 50) || "No messages yet", lastMessageTime: data.lastMessageTime?.toDate() || new Date(), type: u.role === "counselor" ? "counselor" : "peer-mentor" });
              }
            }
          } catch { /* ignore */ }
        }
        if (!mounted) return;
        list.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
        setRecentConversations(list.slice(0, 5));
      } catch { /* ignore */ }
      finally { if (mounted) setLoadingConversations(false); }
    }
    void fetchConversations();
    return () => { mounted = false; };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const joined = (profile as any).joinedForums;
    if (Array.isArray(joined) && joined.length > 0) {
      setHasJoinedForum(true);
      return;
    }
    if (!db) return;
    getDocs(query(collection(db, "forumMembers"), where("userId", "==", profile.uid), limit(1)))
      .then((snap) => { if (!snap.empty) setHasJoinedForum(true); })
      .catch(() => {});
  }, [profile]);

  const formatBookingDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatConvTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const onboardingSteps = [
    { label: "Complete your profile", done: !!profile?.fullName, href: "/student/settings" },
    { label: "Book your first session", done: hasEverBooked, href: "/student/counselors" },
    { label: "Start a conversation", done: recentConversations.length > 0, href: "/student/inbox" },
    { label: "Join a forum", done: hasJoinedForum, href: "/student/forums" },
  ];

  const allOnboardingDone = onboardingSteps.every((s) => s.done);
  const showOnboarding = !loadingBookings && !loadingConversations && !allOnboardingDone;

  const formatLastMessage = (msg: string) => {
    if (msg.startsWith("📞") || msg.toLowerCase().includes("voice call")) return "📞 Voice call";
    if (msg.startsWith("📹") || msg.toLowerCase().includes("video call")) return "📹 Video call";
    if (msg === "🎤 Voice message") return "🎤 Voice message";
    return msg;
  };

  const statsConfig = [
    {
      label: "Sessions",
      value: loadingBookings ? "--" : upcomingBookings.length,
      icon: Calendar,
      iconBg: "bg-[#0F4F47]/10",
      iconColor: "text-[#0F4F47]",
      emptyAction: "Book your first session →",
      emptyHref: "/student/counselors",
    },
    {
      label: "Conversations",
      value: loadingConversations ? "--" : recentConversations.length,
      icon: MessageCircle,
      iconBg: "bg-[#2BB5A0]/10",
      iconColor: "text-[#2BB5A0]",
      emptyAction: "Start a chat →",
      emptyHref: "/student/chat",
    },
    {
      label: "Counselors",
      value: loadingConversations ? "--" : recentConversations.filter((c) => c.type === "counselor").length,
      icon: UserCheck,
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      emptyAction: "Browse counselors →",
      emptyHref: "/student/counselors",
    },
    {
      label: "Peer Mentors",
      value: loadingConversations ? "--" : recentConversations.filter((c) => c.type === "peer-mentor").length,
      icon: Users,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
      emptyAction: "Find a mentor →",
      emptyHref: "/student/peer-mentors",
    },
  ];

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-8 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Dashboard
                </h1>
                {firstName && (
                  <p className="mt-1 text-[15px] text-gray-500 dark:text-gray-400">
                    Welcome back, {firstName} 👋 How are you feeling today?
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 sm:inline-flex">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayFormatted}
                </span>
                <button
                  onClick={() => router.push("/student/inbox")}
                  className="relative rounded-lg border border-gray-200 dark:border-gray-700 p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label="Inbox"
                >
                  <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Mood check-in */}
            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">How&apos;s your mood?</span>
                <div className="flex gap-2">
                  {moods.map((m, i) => (
                    <button key={m.label} onClick={() => setSelectedMood(i)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-[20px] transition-all
                        ${selectedMood === i
                          ? "bg-[#0F4F47] scale-110 shadow-lg shadow-[#0F4F47]/20"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:scale-105"}`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
                {selectedMood !== null && (
                  <span className="text-[13px] text-[#2BB5A0] font-medium animate-in fade-in">
                    Feeling {moods[selectedMood].label.toLowerCase()} — noted! 💚
                  </span>
                )}
              </div>
            </div>

            {/* AI Chat Quick Start */}
            <button onClick={() => router.push("/student/chat")}
              className="group mb-6 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-[#0F4F47] to-[#1A7A6E] p-5 text-left transition-all hover:shadow-xl hover:shadow-[#0F4F47]/15">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Sparkles className="h-6 w-6 text-[#F5C842]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white">Feeling overwhelmed? Talk to our AI now</p>
                <p className="mt-0.5 text-[13px] text-white/60">Available 24/7 — private, confidential, and free</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-white/80" />
            </button>

            {/* Stats Row */}
            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800 md:grid-cols-4">
                {statsConfig.map((stat) => {
                  const Icon = stat.icon;
                  const isEmpty = stat.value === 0;
                  return (
                    <div key={stat.label} className="p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.iconBg}`}>
                          <Icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{stat.label}</p>
                      </div>
                      {isEmpty ? (
                        <button onClick={() => router.push(stat.emptyHref)}
                          className="text-[13px] font-semibold text-[#2BB5A0] hover:underline">
                          {stat.emptyAction}
                        </button>
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Onboarding checklist — visible until all steps are completed */}
            {showOnboarding && (
              <div className="mb-6 rounded-xl border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Get started with Theraklick</h3>
                  <span className="text-[12px] font-semibold text-[#0F4F47]">
                    {onboardingSteps.filter((s) => s.done).length}/{onboardingSteps.length} done
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">Complete these steps to make the most of your experience.</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2BB5A0] transition-all duration-500"
                    style={{ width: `${(onboardingSteps.filter((s) => s.done).length / onboardingSteps.length) * 100}%` }} />
                </div>
                <div className="mt-4 space-y-3">
                  {onboardingSteps.map((step) => (
                    <button key={step.label} onClick={() => router.push(step.href)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                      {step.done ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-[#2BB5A0]" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" />
                      )}
                      <span className={`text-[14px] font-medium ${step.done ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}`}>
                        {step.label}
                      </span>
                      <ArrowRight className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Sessions */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming sessions</h2>
                <button onClick={() => router.push("/student/bookings")}
                  className="flex items-center gap-1 text-[13px] font-medium text-[#2BB5A0] hover:text-[#1A7A6E]">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {loadingBookings ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F4F47]/10">
                      <Calendar className="h-4 w-4 text-[#0F4F47]" />
                    </div>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400">No upcoming sessions</p>
                  </div>
                  <button onClick={() => router.push("/student/counselors")}
                    className="flex items-center gap-1.5 rounded-full bg-[#0F4F47] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1A7A6E]">
                    Book a session <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {upcomingBookings.map((booking) => (
                    <button key={booking.id} onClick={() => router.push("/student/bookings")}
                      className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-[#0F4F47]/5 dark:bg-[#0F4F47]/10 p-5 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{booking.counselorName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5" /> {booking.startTime} - {booking.endTime}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatBookingDate(booking.date, booking.startTime)}</p>
                      <div className="mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#0F4F47] text-xs font-bold text-white">
                        {booking.counselorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations — warm card layout */}
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent conversations</h2>
                <button onClick={() => router.push("/student/inbox")}
                  className="flex items-center gap-1 text-[13px] font-medium text-[#2BB5A0] hover:text-[#1A7A6E]">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {loadingConversations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2BB5A0]/10">
                      <MessageCircle className="h-4 w-4 text-[#2BB5A0]" />
                    </div>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400">No conversations yet</p>
                  </div>
                  <button onClick={() => router.push("/student/counselors")}
                    className="flex items-center gap-1.5 rounded-full bg-[#0F4F47] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1A7A6E]">
                    Start a chat <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentConversations.map((conv) => {
                    const initials = conv.name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                    const isCall = conv.lastMessage.toLowerCase().includes("voice call") || conv.lastMessage.toLowerCase().includes("video call");
                    const isVoiceMsg = conv.lastMessage === "🎤 Voice message";

                    return (
                      <button key={conv.chatId}
                        onClick={() => router.push("/student/inbox")}
                        className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3.5 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F4F47] text-sm font-bold text-white">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">{conv.name}</span>
                            <span className="shrink-0 rounded-full bg-[#0F4F47]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0F4F47] dark:text-[#2BB5A0]">
                              {conv.type === "counselor" ? "Counselor" : "Mentor"}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            {isCall && <Phone className="h-3 w-3 text-gray-400" />}
                            {isVoiceMsg && <span className="text-[12px]">🎤</span>}
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                              {formatLastMessage(conv.lastMessage)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] text-gray-400">{formatConvTime(conv.lastMessageTime)}</span>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-[#2BB5A0] transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Wellness Tips Grid */}
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Wellness tips</h2>
                <a href="https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] font-medium text-[#2BB5A0] hover:text-[#1A7A6E]">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {insightCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                          <Icon className={`h-4 w-4 ${card.accent}`} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${card.bg.includes("emerald") ? "bg-emerald-500" : card.bg.includes("blue") ? "bg-blue-500" : card.bg.includes("purple") ? "bg-purple-500" : card.bg.includes("pink") ? "bg-pink-500" : card.bg.includes("orange") ? "bg-orange-500" : "bg-teal-500"}`} />
                          <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">{card.label}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{card.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {card.body}
                      </p>
                      {card.href && (
                        <a href={card.href} target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#2BB5A0] hover:text-[#1A7A6E]">
                          Read more <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Reads */}
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick reads</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <a href="https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
                  target="_blank" rel="noopener noreferrer"
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">WHO Report</span>
                    </div>
                  </div>
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#0F4F47]">Mental Health: Facts & Figures</p>
                  <p className="mt-1.5 text-[13px] leading-[1.5] text-gray-500 dark:text-gray-400"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    Understanding the global mental health landscape — key statistics, risk factors, and what countries are doing to improve access to care.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2BB5A0] group-hover:gap-2 transition-all">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </a>
                <a href="https://www.headspace.com/meditation/meditation-for-beginners"
                  target="_blank" rel="noopener noreferrer"
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950">
                      <Wind className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">Headspace</span>
                    </div>
                  </div>
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#0F4F47]">Meditation for Beginners</p>
                  <p className="mt-1.5 text-[13px] leading-[1.5] text-gray-500 dark:text-gray-400"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    A gentle introduction to meditation — how to start, what to expect, and simple techniques that take just 5 minutes a day.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2BB5A0] group-hover:gap-2 transition-all">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </a>
              </div>
            </div>

            {/* Report Issue */}
            <div className="text-center">
              <button onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 transition-colors hover:border-red-200 dark:hover:border-red-800 hover:text-red-500">
                <Flag className="h-3 w-3" /> Report an issue
              </button>
            </div>

          </div>
        </div>
      </div>

      {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}
    </LayoutWrapper>
  );
}
