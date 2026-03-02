"use client";

/**
 * STUDENT DASHBOARD — Alive, insightful, no redundancy.
 * 
 * WHY this design:
 *   - Sidebar already has nav links → NO duplicate quick-action buttons here.
 *   - Dashboard = your home feed. Tips rotate, insights scroll, content moves.
 *   - Mental health awareness baked into the experience, not bolted on.
 */

import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Calendar, Clock, ArrowRight, Bell, Lightbulb, Heart,
  MessageCircle, Brain, Moon, Sparkles, Wind, Flag,
  TrendingUp, BookOpen, ChevronRight, Leaf,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, where, limit, onSnapshot, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportIssueModal } from "@/components/ReportIssueModal";

/* ── Mood options ── */
const moods = [
  { id: "great", label: "Great", color: "bg-emerald-500", response: "Glad to hear it! Keep that momentum." },
  { id: "okay", label: "Okay", color: "bg-blue-500", response: "Thanks for checking in. We're here if you need anything." },
  { id: "low", label: "Low", color: "bg-amber-500", response: "It's okay to feel this way. Would you like to talk to someone?" },
  { id: "stressed", label: "Stressed", color: "bg-red-400", response: "Take a breath. Let's work through this together." },
];

/* ── Rotating wellness feed — cycles every 6 seconds ── */
const wellnessFeed = [
  { icon: Brain, label: "MENTAL HEALTH", text: "1 in 4 college students report feeling anxious most days. You're not alone." },
  { icon: Moon, label: "SLEEP TIP", text: "Blue light from screens suppresses melatonin by 50%. Try a 30-min screen-off before bed." },
  { icon: Heart, label: "SELF-CARE", text: "Even 10 minutes of walking reduces cortisol levels by 25%." },
  { icon: Wind, label: "BREATHING", text: "Box breathing (4s in, 4s hold, 4s out, 4s hold) can lower heart rate in under 2 minutes." },
  { icon: Lightbulb, label: "DID YOU KNOW", text: "Journaling for 15 minutes a day has been shown to boost immune function." },
  { icon: Leaf, label: "MINDFULNESS", text: "A 5-minute body scan reduces stress perception by 23%, even during exams." },
  { icon: TrendingUp, label: "STUDY TIP", text: "Spaced repetition with breaks is 40% more effective than cramming for long hours." },
  { icon: Brain, label: "AWARENESS", text: "Depression and anxiety are the #1 and #2 mental health issues among university students." },
  { icon: Heart, label: "CONNECTION", text: "People with 3+ close friendships report 2x higher life satisfaction." },
  { icon: Moon, label: "RECOVERY", text: "A 20-minute nap between study sessions improves retention by 34%." },
];

/* ── Insight cards — horizontal scroll ── */
const insightCards = [
  {
    label: "BREATHE",
    title: "60-Second Reset",
    body: "When overwhelmed, try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 3 times.",
    action: "Try it now",
    href: null,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    label: "SLEEP",
    title: "Your Sleep Score Matters",
    body: "Students who sleep 7+ hours score 10% higher on exams. Quality sleep is a study strategy.",
    action: "Read more",
    href: "https://www.sleepfoundation.org/sleep-hygiene",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    label: "MINDSET",
    title: "Reframe Negative Thoughts",
    body: "Replace 'I can't handle this' with 'I'm learning to handle this.' Small shifts, big impact.",
    action: "Learn CBT basics",
    href: "https://www.verywellmind.com/what-is-cognitive-behavior-therapy-2795747",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    label: "MOVEMENT",
    title: "Move for 10 Minutes",
    body: "A short walk releases endorphins and BDNF, which improve mood and memory retention.",
    action: "Quick exercises",
    href: "https://www.nhs.uk/live-well/exercise/exercise-health-benefits/",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    label: "CONNECT",
    title: "Reach Out Today",
    body: "Loneliness increases stress hormones by 20%. Even a 5-minute conversation helps.",
    action: "Talk to someone",
    href: null,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  {
    label: "NUTRITION",
    title: "Brain Food",
    body: "Omega-3s, blueberries, and dark chocolate boost focus and reduce brain fog during study sessions.",
    action: "Nutrition tips",
    href: "https://www.health.harvard.edu/mind-and-mood/foods-linked-to-better-brainpower",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
];

/* ── Types ── */
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

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [upcomingSoon, setUpcomingSoon] = useState<UpcomingBooking | null>(null);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [entered, setEntered] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Rotating feed state
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);

  // Insight track scroll ref
  const trackRef = useRef<HTMLDivElement>(null);

  const firstName =
    profile?.role === "student" && profile.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : profile?.fullName?.split(" ")[0] || null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  // Page enter animation
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(id);
  }, []);

  /* ── Rotating feed ticker — cycles every 6s with slide animation ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedVisible(false); // start exit animation
      setTimeout(() => {
        setFeedIndex((prev) => (prev + 1) % wellnessFeed.length);
        setFeedVisible(true); // start enter animation
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  /* ── Load bookings ── */
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
      let soonest: UpcomingBooking | null = null;
      let soonestTime = Infinity;

      snap.docs.forEach((d) => {
        const data = d.data();
        const bookingDate = new Date(`${data.date}T${data.startTime}`);
        if (bookingDate > new Date()) {
          const booking: UpcomingBooking = {
            id: d.id,
            counselorName: data.counselorName || "Counselor",
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          };
          bookings.push(booking);
          const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursUntil > 0 && hoursUntil <= 24 && hoursUntil < soonestTime) {
            soonest = booking;
            soonestTime = hoursUntil;
          }
        }
      });

      bookings.sort((a, b) =>
        new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      );

      setUpcomingBookings(bookings.slice(0, 3));
      setUpcomingSoon(soonest);
      setLoadingBookings(false);
    }, () => setLoadingBookings(false));

    return () => unsub();
  }, [profile]);

  /* ── Load conversations ── */
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
      setRecentConversations(list.slice(0, 3));
      setLoadingConversations(false);
    }, () => setLoadingConversations(false));

    return () => unsub();
  }, [profile]);

  /* ── Helpers ── */
  const formatBookingDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  };

  const getTimeUntil = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    const hours = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 1) return `${Math.floor((date.getTime() - Date.now()) / (1000 * 60))} minutes`;
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
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

  // Staggered entrance animation helper
  const s = (ms: number) =>
    `transition-all duration-[600ms] delay-[${ms}ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`;

  // Current feed item
  const currentFeed = wellnessFeed[feedIndex];
  const FeedIcon = currentFeed.icon;

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-[#0D1F1D]">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#2BB5A0]/8 blur-[120px]" />
          <div className="absolute -right-20 top-1/2 h-96 w-96 rounded-full bg-[#1A7A6E]/8 blur-[140px]" />
        </div>

        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">

            {/* ── HEADER ── */}
            <div className={`mb-8 flex items-start justify-between ${s(0)}`}>
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {greeting}{firstName ? `, ${firstName}` : ""}
                </h1>
                <p className="mt-1 text-sm text-[#6B8C89]">{todayFormatted}</p>
                {!firstName && profile && (
                  <button
                    onClick={() => router.push("/student/settings")}
                    className="mt-2 text-xs text-[#2BB5A0] hover:underline"
                  >
                    Add your name to personalize your experience
                  </button>
                )}
              </div>
              <button
                onClick={() => router.push("/student/inbox")}
                className="rounded-xl border border-white/[0.08] bg-white/5 p-2.5
                  transition-all hover:border-[#2BB5A0]/30 hover:bg-white/10"
                aria-label="Inbox"
              >
                <Bell className="h-5 w-5 text-[#6B8C89]" />
              </button>
            </div>

            {/* ── UPCOMING SESSION ALERT ── */}
            {upcomingSoon && (
              <div className={`mb-6 rounded-2xl border border-[#F5C842]/20
                bg-[#F5C842]/5 p-5 ${s(60)}`}>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#F5C842]/15 p-3">
                    <Bell className="h-5 w-5 text-[#F5C842]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">Upcoming session</p>
                    <p className="mt-1 text-sm text-gray-300">
                      {upcomingSoon.counselorName} in{" "}
                      <span className="font-medium text-[#F5C842]">
                        {getTimeUntil(upcomingSoon.date, upcomingSoon.startTime)}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6B8C89]">
                      <Clock className="h-3.5 w-3.5" />
                      {formatBookingDate(upcomingSoon.date, upcomingSoon.startTime)}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/student/bookings")}
                    className="shrink-0 rounded-lg border border-[#F5C842]/30 px-4 py-2
                      text-sm font-medium text-[#F5C842] transition-all
                      hover:bg-[#F5C842]/10"
                  >
                    View
                  </button>
                </div>
              </div>
            )}

            {/* ── MOOD CHECK-IN — compact row ── */}
            <div className={`mb-6 rounded-2xl border border-white/[0.08]
              bg-white/[0.03] p-5 ${s(100)}`}>
              <p className="mb-3 text-sm font-medium text-white">
                How are you feeling right now?
              </p>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium
                      transition-all duration-200
                      ${selectedMood === mood.id
                        ? "border-[#2BB5A0] bg-[#2BB5A0] text-white scale-[1.04]"
                        : "border-white/[0.12] bg-transparent text-white/70 hover:border-[#2BB5A0]/50 hover:text-white"
                      }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${mood.color} ${selectedMood === mood.id ? "bg-white" : ""}`} />
                    {mood.label}
                  </button>
                ))}
              </div>
              {selectedMood && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.04] p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-[#2BB5A0] shrink-0" />
                  <p className="text-sm text-gray-300">
                    {moods.find((m) => m.id === selectedMood)?.response}
                  </p>
                </div>
              )}
            </div>

            {/* ── LIVE WELLNESS FEED — auto-rotating ticker ── */}
            <div className={`mb-6 overflow-hidden rounded-2xl border border-white/[0.08]
              bg-gradient-to-r from-white/[0.04] to-white/[0.02] ${s(160)}`}>
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2">
                <span className="live-dot" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2BB5A0]">
                  Wellness Feed
                </span>
              </div>
              <div className="relative h-[72px] overflow-hidden px-5">
                <div
                  className={`absolute inset-x-5 flex items-center gap-4 py-4
                    transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
                    ${feedVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-4 opacity-0"
                    }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2BB5A0]/10">
                    <FeedIcon className="h-4.5 w-4.5 text-[#2BB5A0]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B8C89]">
                      {currentFeed.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm leading-snug text-gray-300">
                      {currentFeed.text}
                    </p>
                  </div>
                </div>
              </div>
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1 pb-3">
                {wellnessFeed.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setFeedVisible(false); setTimeout(() => { setFeedIndex(i); setFeedVisible(true); }, 200); }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === feedIndex ? "w-4 bg-[#2BB5A0]" : "w-1 bg-white/20"
                    }`}
                    aria-label={`Tip ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ── INSIGHTS TRACK — horizontal scrolling cards ── */}
            <div className={`mb-6 ${s(220)}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Wellness Insights
                </h2>
                <span className="text-[10px] uppercase tracking-widest text-[#6B8C89]">
                  Swipe
                </span>
              </div>
              <div className="insights-track" ref={trackRef}>
                {insightCards.map((card, i) => (
                  <div key={i} className="insight-card group">
                    <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${card.bgColor}`}>
                      {i === 0 && <Wind className={`h-4 w-4 ${card.color}`} />}
                      {i === 1 && <Moon className={`h-4 w-4 ${card.color}`} />}
                      {i === 2 && <Brain className={`h-4 w-4 ${card.color}`} />}
                      {i === 3 && <TrendingUp className={`h-4 w-4 ${card.color}`} />}
                      {i === 4 && <Heart className={`h-4 w-4 ${card.color}`} />}
                      {i === 5 && <Leaf className={`h-4 w-4 ${card.color}`} />}
                    </div>
                    <p className="insight-label">{card.label}</p>
                    <p className="insight-title">{card.title}</p>
                    <p className="insight-body">{card.body}</p>
                    {card.href ? (
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="insight-action"
                      >
                        {card.action} <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          if (card.label === "CONNECT") router.push("/student/counselors");
                        }}
                        className="insight-action"
                      >
                        {card.action} <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── TWO-COLUMN: Sessions + Conversations ── */}
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              {/* Upcoming Sessions */}
              <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 ${s(280)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Upcoming sessions</h2>
                  <button
                    onClick={() => router.push("/student/bookings")}
                    className="flex items-center gap-1 text-xs text-[#2BB5A0] hover:text-[#7BD8CA]"
                  >
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {loadingBookings ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-white/[0.04]" style={{
                        background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "gradient-x 1.5s ease infinite",
                      }} />
                    ))}
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="py-6 text-center">
                    <Calendar className="mx-auto mb-2 h-8 w-8 text-[#6B8C89]/50" />
                    <p className="text-sm text-[#6B8C89]">No upcoming sessions</p>
                    <button
                      onClick={() => router.push("/student/counselors")}
                      className="mt-3 text-xs text-[#2BB5A0] hover:underline"
                    >
                      Book a session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingBookings.map((booking) => (
                      <div key={booking.id}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06]
                          bg-white/[0.03] p-3 transition-all hover:border-[#2BB5A0]/20">
                        <div className="rounded-lg bg-[#2BB5A0]/10 p-2">
                          <Calendar className="h-4 w-4 text-[#2BB5A0]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{booking.counselorName}</p>
                          <p className="text-xs text-[#6B8C89]">{formatBookingDate(booking.date, booking.startTime)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Conversations */}
              <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 ${s(340)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Recent conversations</h2>
                  <button
                    onClick={() => router.push("/student/inbox")}
                    className="flex items-center gap-1 text-xs text-[#2BB5A0] hover:text-[#7BD8CA]"
                  >
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {loadingConversations ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-white/[0.04]" style={{
                        background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "gradient-x 1.5s ease infinite",
                      }} />
                    ))}
                  </div>
                ) : recentConversations.length === 0 ? (
                  <div className="py-6 text-center">
                    <MessageCircle className="mx-auto mb-2 h-8 w-8 text-[#6B8C89]/50" />
                    <p className="text-sm text-[#6B8C89]">No conversations yet</p>
                    <p className="mt-1 text-xs text-[#6B8C89]/70">
                      Start chatting with a counselor or peer mentor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() =>
                          router.push(
                            conv.type === "counselor"
                              ? `/student/counselors/${conv.id}`
                              : `/student/peer-mentors/${conv.id}`
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06]
                          bg-white/[0.03] p-3 text-left transition-all hover:border-[#2BB5A0]/20"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                          conv.type === "counselor" ? "bg-blue-500/30" : "bg-[#2BB5A0]/30"
                        }`}>
                          {conv.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white truncate">{conv.name}</span>
                            <span className="ml-2 shrink-0 text-[10px] text-[#6B8C89]">
                              {formatConvTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#6B8C89]">{conv.lastMessage}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── QUICK READS — curated external resources ── */}
            <div className={`mb-6 ${s(400)}`}>
              <h2 className="mb-3 text-sm font-semibold text-white">Quick reads</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08]
                    bg-white/[0.03] p-4 transition-all hover:border-[#2BB5A0]/20 hover:bg-white/[0.05]
                    group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-[#2BB5A0] transition-colors">
                      Mental Health: Facts & Figures
                    </p>
                    <p className="text-xs text-[#6B8C89]">WHO Report</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#6B8C89] shrink-0 group-hover:text-[#2BB5A0] transition-colors" />
                </a>
                <a
                  href="https://www.headspace.com/meditation/meditation-for-beginners"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08]
                    bg-white/[0.03] p-4 transition-all hover:border-blue-500/20 hover:bg-white/[0.05]
                    group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <Wind className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      Meditation for Beginners
                    </p>
                    <p className="text-xs text-[#6B8C89]">Headspace</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#6B8C89] shrink-0 group-hover:text-blue-400 transition-colors" />
                </a>
              </div>
            </div>

            {/* ── REPORT ISSUE — small, unobtrusive ── */}
            <div className={`text-center ${s(460)}`}>
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.06]
                  px-4 py-2 text-xs text-[#6B8C89] transition-all hover:border-red-500/20
                  hover:text-red-400"
              >
                <Flag className="h-3 w-3" />
                Report an issue
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <ReportIssueModal onClose={() => setShowReportModal(false)} />
      )}
    </LayoutWrapper>
  );
}
