"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Calendar, Clock, User, Video, Phone, Star,
  ChevronLeft, ChevronRight, RotateCcw,
  MessageSquare, Sparkles, List, CalendarDays, AlertCircle, X,
} from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { notifyBookingCancelled, notifyCounselorCancellation } from "@/lib/notify";

interface Booking {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorSpecialty?: string;
  counselorAvatar?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration?: number;
  sessionType?: "video" | "voice" | "chat";
  status: "pending" | "confirmed" | "completed" | "cancelled" | "declined";
  message?: string;
  review?: { rating: number; text?: string };
  createdAt: Date;
}

type Tab = "upcoming" | "past" | "cancelled";
type ViewMode = "list" | "calendar";

function getInitials(name: string) {
  return name.replace(/^Dr\.?\s*/i, "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatSessionDate(dateStr?: string, startTime?: string) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T${startTime || "00:00"}`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(time?: string) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;
}

function getCountdown(dateStr?: string, startTime?: string): string | null {
  if (!dateStr || !startTime) return null;
  const target = new Date(`${dateStr}T${startTime}`).getTime();
  if (isNaN(target)) return null;
  const now = Date.now();
  const diff = target - now;
  if (diff < 0) return null;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 48) { const days = Math.floor(hours / 24); return `${days} day${days !== 1 ? "s" : ""}`; }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} minutes`;
}

function canJoin(dateStr?: string, startTime?: string) {
  if (!dateStr || !startTime) return false;
  const target = new Date(`${dateStr}T${startTime}`).getTime();
  if (isNaN(target)) return false;
  return target - Date.now() < 5 * 60 * 1000 && target - Date.now() > -60 * 60 * 1000;
}

const SESSION_ICONS = { video: Video, voice: Phone, chat: MessageSquare };

// ── Calendar helpers ──────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function StudentBookingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [countdownTick, setCountdownTick] = useState(0);

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  // Live countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setCountdownTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      if (!profile || !db) { setLoading(false); return; }
      try {
        const q = query(collection(db, "bookings"), where("studentId", "==", profile.uid));
        const snap = await getDocs(q);
        const list: Booking[] = snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() } as Booking;
        });
        list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        // Auto-complete bookings whose date has passed but status is still confirmed/pending
        const now = new Date();
        const stale = list.filter((b) => {
          if (b.status !== "confirmed" && b.status !== "pending") return false;
          if (!b.date) return false;
          const end = new Date(`${b.date}T${b.endTime || b.startTime || "23:59"}`);
          return !isNaN(end.getTime()) && end < now;
        });

        if (stale.length > 0 && db) {
          const fs = db;
          await Promise.all(
            stale.map((b) =>
              updateDoc(doc(fs, "bookings", b.id), { status: "completed", completedAt: new Date() }).catch(() => {})
            )
          );
          stale.forEach((b) => { b.status = "completed"; });
        }

        setBookings(list);
      } catch (err) {
        console.warn("Bookings load error:", err);
        setBookings([]);
      }
      setLoading(false);
    }
    void load();
  }, [profile]);

  const isUpcoming = (b: Booking) => {
    if (!b.date) return false;
    const end = new Date(`${b.date}T${b.endTime || b.startTime || "23:59"}`);
    return !isNaN(end.getTime()) && end > new Date() && (b.status === "confirmed" || b.status === "pending");
  };

  const filtered = useMemo(() => {
    if (activeTab === "upcoming") return bookings.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date));
    if (activeTab === "cancelled") return bookings.filter((b) => b.status === "cancelled").sort((a, b) => b.date.localeCompare(a.date));
    return bookings.filter((b) => b.status === "completed" || (!isUpcoming(b) && b.status !== "cancelled")).sort((a, b) => b.date.localeCompare(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, activeTab, countdownTick]);

  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed" || (!isUpcoming(b) && b.status !== "cancelled")).length;
    const upcoming = bookings.filter(isUpcoming).length;
    const earliest = bookings.reduce((min, b) => (b.createdAt < min ? b.createdAt : min), new Date());
    const memberSince = earliest.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { completed, upcoming, memberSince };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const nextSession = useMemo(() => {
    return bookings.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, countdownTick]);

  // Calendar bookings map
  const calBookings = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => { (map[b.date] ||= []).push(b); });
    return map;
  }, [bookings]);

  const handleCancel = async (id: string) => {
    if (!db || !confirm("Cancel this session? You can rebook anytime.")) return;
    try {
      await updateDoc(doc(db, "bookings", id), { status: "cancelled" });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));

      const cancelled = bookings.find((b) => b.id === id);
      const appUrl = window.location.origin;

      // Notify the student
      if (cancelled && profile?.email) {
        notifyBookingCancelled(
          profile.uid, profile.email, profile.fullName || "",
          cancelled.counselorName || "your counselor",
          `${cancelled.date} at ${formatTime(cancelled.startTime)}`, appUrl
        );
      }

      // Notify the counselor
      if (cancelled?.counselorId) {
        const counselorSnap = await getDoc(doc(db, "users", cancelled.counselorId));
        const counselorData = counselorSnap.data();
        if (counselorData?.email) {
          notifyCounselorCancellation(
            cancelled.counselorId, counselorData.email, counselorData.fullName || "",
            profile?.fullName || "A student",
            `${cancelled.date} at ${formatTime(cancelled.startTime)}`, appUrl
          );
        }
      }
    } catch { alert("Could not cancel. Try again."); }
  };

  const handleReview = async (bookingId: string) => {
    if (!reviewRating) return;
    if (db) {
      try {
        await updateDoc(doc(db, "bookings", bookingId), { review: { rating: reviewRating, text: reviewText } });
      } catch { /* demo mode */ }
    }
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, review: { rating: reviewRating, text: reviewText } } : b)));
    setReviewingId(null);
    setReviewRating(0);
    setReviewText("");
  };

  const tabCounts = useMemo(() => ({
    upcoming: bookings.filter(isUpcoming).length,
    past: bookings.filter((b) => b.status === "completed" || (!isUpcoming(b) && b.status !== "cancelled")).length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bookings]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "cancelled", label: "Cancelled" },
  ];

  // ── Calendar rendering ──────────────────────────────────────────
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calPrev = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); };
  const calNext = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[#2BB5A0]">Sessions</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
              </div>
              <button onClick={() => router.push("/student/counselors")}
                className="flex items-center gap-2 rounded-xl bg-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1A7A6E]">
                <Calendar className="h-4 w-4" /> Book a Session
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900" />
                ))}
              </div>
            ) : (
              <>
                {/* Stats bar */}
                <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
                  <span><strong className="text-gray-900 dark:text-gray-100">{stats.completed}</strong> session{stats.completed !== 1 ? "s" : ""} completed</span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span><strong className="text-gray-900 dark:text-gray-100">{stats.upcoming}</strong> upcoming</span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>Member since {stats.memberSince}</span>
                </div>

                {/* Next session countdown */}
                {nextSession && (
                  <div className="mb-5 rounded-2xl border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-[#2BB5A0]">Next session</p>
                      <p className="mt-0.5 text-[15px] font-bold text-gray-900 dark:text-gray-100">
                        {nextSession.counselorName} — {formatSessionDate(nextSession.date, nextSession.startTime)} at {formatTime(nextSession.startTime)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-gray-500">
                        {(() => { const cd = getCountdown(nextSession.date, nextSession.startTime); return cd ? `Starts in ${cd}` : "Starting now"; })()}
                      </p>
                    </div>
                    <button
                      onClick={() => canJoin(nextSession.date, nextSession.startTime) ? alert("Joining session...") : null}
                      disabled={!canJoin(nextSession.date, nextSession.startTime)}
                      className={`rounded-xl px-5 py-2.5 text-[13px] font-bold transition-all ${
                        canJoin(nextSession.date, nextSession.startTime)
                          ? "bg-[#0F4F47] text-white hover:bg-[#1A7A6E] animate-pulse"
                          : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"}`}>
                      {canJoin(nextSession.date, nextSession.startTime) ? "Join Now" : "Join (opens 5 min before)"}
                    </button>
                  </div>
                )}

                {/* Tabs + view toggle */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-900 p-1">
                    {TABS.map((tab) => (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
                          activeTab === tab.key
                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        {tab.label}
                        {tabCounts[tab.key] > 0 && (
                          <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                            activeTab === tab.key ? "bg-[#0F4F47] text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
                            {tabCounts[tab.key]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5">
                    <button onClick={() => setViewMode("list")}
                      className={`rounded-md p-2 transition-colors ${viewMode === "list" ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
                      <List className="h-4 w-4" />
                    </button>
                    <button onClick={() => setViewMode("calendar")}
                      className={`rounded-md p-2 transition-colors ${viewMode === "calendar" ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
                      <CalendarDays className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar view */}
                {viewMode === "calendar" && (
                  <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <button onClick={calPrev} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-4 w-4" /></button>
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{monthLabel}</h3>
                      <button onClick={calNext} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <div key={d} className="py-2 text-[11px] font-medium text-gray-400">{d}</div>
                      ))}
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayBookings = calBookings[dateStr] || [];
                        const isToday = dateStr === now.toISOString().split("T")[0];
                        return (
                          <div key={day} className={`relative flex flex-col items-center rounded-lg py-2 ${isToday ? "bg-[#2BB5A0]/10" : ""}`}>
                            <span className={`text-[13px] ${isToday ? "font-bold text-[#0F4F47]" : "text-gray-700 dark:text-gray-300"}`}>{day}</span>
                            {dayBookings.length > 0 && (
                              <div className="mt-0.5 flex gap-0.5">
                                {dayBookings.slice(0, 3).map((b) => (
                                  <div key={b.id} className={`h-1.5 w-1.5 rounded-full ${
                                    b.status === "confirmed" || b.status === "pending" ? "bg-[#2BB5A0]" : b.status === "completed" ? "bg-gray-400" : "bg-red-400"}`} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#2BB5A0]" /> Upcoming</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Completed</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Cancelled</span>
                    </div>
                  </div>
                )}

                {/* Booking cards (list) */}
                {viewMode === "list" && (
                  <div className="space-y-3">
                    {filtered.length === 0 && (
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-16 text-center">
                        <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-[14px] font-medium text-gray-500">No {activeTab} sessions</p>
                        {activeTab === "upcoming" && (
                          <div className="mt-4 flex flex-col items-center gap-2">
                            <button onClick={() => router.push("/student/counselors")}
                              className="rounded-xl bg-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
                              Browse Counselors
                            </button>
                            <button onClick={() => router.push("/student/chat")}
                              className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-[#2BB5A0] transition-colors">
                              <Sparkles className="h-3.5 w-3.5" /> Not ready to book? Chat with our AI first →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {filtered.map((b) => {
                      const SessionIcon = SESSION_ICONS[b.sessionType || "video"];
                      const upcoming = isUpcoming(b);
                      const joinable = upcoming && canJoin(b.date, b.startTime);
                      const countdown = upcoming ? getCountdown(b.date, b.startTime) : null;

                      return (
                        <div key={b.id} className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                          upcoming ? "border-[#2BB5A0]/20 bg-white dark:bg-gray-950" :
                          b.status === "cancelled" ? "border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10" :
                          "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"}`}>
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {b.counselorAvatar ? (
                                <img src={b.counselorAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4F47]/10 text-[14px] font-bold text-[#0F4F47]">
                                  {getInitials(b.counselorName)}
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{b.counselorName}</h3>
                                {/* Status badge — use isUpcoming to determine real state */}
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  upcoming ? "bg-[#2BB5A0]/10 text-[#2BB5A0]" :
                                  b.status === "cancelled" ? "bg-red-100 dark:bg-red-900/30 text-red-500" :
                                  "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                                  {upcoming ? (b.status === "pending" ? "Pending" : "Upcoming") :
                                   b.status === "cancelled" ? "Cancelled" : "Completed"}
                                </span>
                              </div>
                              {b.counselorSpecialty && (
                                <p className="mt-0.5 text-[12px] text-gray-400">{b.counselorSpecialty}</p>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                  {formatSessionDate(b.date, b.startTime)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                                  {formatTime(b.startTime)} – {formatTime(b.endTime)}
                                </span>
                                {b.duration && (
                                  <span className="text-gray-400">· {b.duration} min</span>
                                )}
                                <span className="flex items-center gap-1.5">
                                  <SessionIcon className="h-3.5 w-3.5 text-gray-400" />
                                  {b.sessionType === "voice" ? "Voice Call" : b.sessionType === "chat" ? "Chat" : "Video Call"}
                                </span>
                              </div>

                              {/* Countdown for upcoming */}
                              {upcoming && countdown && (
                                <p className="mt-1.5 text-[12px] font-medium text-[#2BB5A0]">
                                  Starts in {countdown}
                                </p>
                              )}

                              {b.message && upcoming && (
                                <p className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2 text-[12px] italic text-gray-500">&ldquo;{b.message}&rdquo;</p>
                              )}

                              {/* Review display for past sessions */}
                              {!upcoming && b.status !== "cancelled" && b.review && (
                                <div className="mt-2 flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`h-3.5 w-3.5 ${i < b.review!.rating ? "fill-[#F5C842] text-[#F5C842]" : "text-gray-300"}`} />
                                  ))}
                                  {b.review.text && <span className="ml-2 text-[12px] text-gray-400">&ldquo;{b.review.text}&rdquo;</span>}
                                </div>
                              )}

                              {/* Review prompt for past sessions without review */}
                              {!upcoming && b.status !== "cancelled" && !b.review && reviewingId !== b.id && (
                                <button onClick={() => { setReviewingId(b.id); setReviewRating(0); setReviewText(""); }}
                                  className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#F5C842] hover:text-[#D4A830] transition-colors">
                                  <Star className="h-3.5 w-3.5" /> Rate your session with {b.counselorName.split(" ")[0]}
                                </button>
                              )}

                              {/* Inline review form */}
                              {reviewingId === b.id && (
                                <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">How was your session?</p>
                                    <button onClick={() => setReviewingId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                  <div className="flex gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button key={s} onClick={() => setReviewRating(s)}
                                        className="transition-transform hover:scale-110">
                                        <Star className={`h-6 w-6 ${s <= reviewRating ? "fill-[#F5C842] text-[#F5C842]" : "text-gray-300 dark:text-gray-600"}`} />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea placeholder="Optional: share your experience..." value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)} rows={2}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#2BB5A0]" />
                                  <button onClick={() => handleReview(b.id)} disabled={!reviewRating}
                                    className="mt-2 rounded-lg bg-[#0F4F47] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1A7A6E] disabled:opacity-40">
                                    Submit Review
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex flex-col gap-2">
                              {upcoming ? (
                                <>
                                  <button
                                    onClick={() => joinable ? alert("Joining session...") : null}
                                    disabled={!joinable}
                                    className={`rounded-xl px-4 py-2 text-[12px] font-bold transition-all ${
                                      joinable ? "bg-[#0F4F47] text-white hover:bg-[#1A7A6E]" : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"}`}>
                                    Join
                                  </button>
                                  <button className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    Reschedule
                                  </button>
                                  <button onClick={() => handleCancel(b.id)}
                                    className="rounded-xl px-4 py-2 text-[12px] font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500">
                                    Cancel
                                  </button>
                                </>
                              ) : b.status === "cancelled" ? (
                                <button onClick={() => router.push("/student/counselors")}
                                  className="flex items-center gap-1.5 rounded-xl border border-[#0F4F47]/20 px-4 py-2 text-[12px] font-bold text-[#0F4F47] hover:bg-[#0F4F47]/5">
                                  <RotateCcw className="h-3 w-3" /> Rebook
                                </button>
                              ) : (
                                <button onClick={() => router.push("/student/counselors")}
                                  className="rounded-xl border border-[#0F4F47]/20 px-4 py-2 text-[12px] font-bold text-[#0F4F47] hover:bg-[#0F4F47]/5">
                                  Book Again
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cancellation policy */}
                <div className="mt-6 flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3 text-[12px] text-gray-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Sessions can be cancelled up to 2 hours before the scheduled time. Repeated no-shows may limit booking availability.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
