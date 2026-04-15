"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Calendar, Clock, CheckCircle, XCircle, Search, FileText, Plus,
  MessageSquare, User, AlertCircle, ChevronDown,
} from "lucide-react";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { notifyBookingConfirmed, notifyBookingDeclined } from "@/lib/notify";

interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  message?: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "declined";
  createdAt: Date;
}

type Tab = "pending" | "upcoming" | "past";

function formatDate(dateStr: string, startTime: string) {
  const date = new Date(`${dateStr}T${startTime}`);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function formatTime(time?: string) {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function CounselorBookingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadBookings() {
      if (!profile || !db) { setLoading(false); return; }
      try {
        const q = query(
          collection(db, "bookings"),
          where("counselorId", "==", profile.uid),
        );
        const snap = await getDocs(q);
        const list: Booking[] = [];

        for (const bookingDoc of snap.docs) {
          const data = bookingDoc.data();
          let studentName = data.studentName || "Student";
          let studentEmail = "";

          try {
            const studentDoc = await getDoc(doc(db, "users", data.studentId));
            const sd = studentDoc.data();
            if (sd) {
              studentName = sd.anonymousEnabled && sd.anonymousId
                ? sd.anonymousId : sd.fullName || studentName;
              studentEmail = sd.email || "";
            }
          } catch { /* use fallback name */ }

          list.push({
            id: bookingDoc.id,
            studentId: data.studentId,
            studentName,
            studentEmail,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            message: data.message,
            notes: data.notes,
            status: data.status || "confirmed",
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        }

        // Auto-complete past confirmed sessions
        const now = new Date();
        const stale = list.filter((b) => {
          if (b.status !== "confirmed") return false;
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

        list.sort((a, b) => new Date(`${b.date}T${b.startTime}`).getTime() - new Date(`${a.date}T${a.startTime}`).getTime());
        setBookings(list);
      } catch (e) {
        console.error("Error loading bookings:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadBookings();
  }, [profile]);

  const handleAccept = async (booking: Booking) => {
    if (!db) return;
    setActionLoading(booking.id);
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "confirmed" });
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "confirmed" } : b));

      if (booking.studentEmail && booking.studentId) {
        const appUrl = window.location.origin;
        const dateStr = formatDate(booking.date, booking.startTime);
        const timeStr = formatTime(booking.startTime);
        notifyBookingConfirmed(
          booking.studentId, booking.studentEmail, booking.studentName,
          profile?.fullName || "your counselor",
          `${dateStr} at ${timeStr}`, appUrl
        );
      }
    } catch (e) {
      console.error("Error accepting:", e);
      alert("Failed to accept booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (booking: Booking) => {
    if (!db || !confirm("Decline this booking request?")) return;
    setActionLoading(booking.id);
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "declined" });
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "declined" } : b));

      if (booking.studentEmail && booking.studentId) {
        const appUrl = window.location.origin;
        const dateStr = formatDate(booking.date, booking.startTime);
        const timeStr = formatTime(booking.startTime);
        notifyBookingDeclined(
          booking.studentId, booking.studentEmail, booking.studentName,
          profile?.fullName || "your counselor",
          `${dateStr} at ${timeStr}`, appUrl
        );
      }
    } catch (e) {
      console.error("Error declining:", e);
      alert("Failed to decline booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkDone = async (bookingId: string) => {
    if (!db || !confirm("Mark this session as completed?")) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: "completed", completedAt: new Date() });
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "completed" } : b));
    } catch (e) {
      console.error("Error:", e);
      alert("Failed to update");
    }
  };

  const saveNotes = async (bookingId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), { notes: notesText.trim(), notesUpdatedAt: new Date() });
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, notes: notesText.trim() } : b));
      setEditingNotes(null);
      setNotesText("");
    } catch (e) {
      console.error("Error saving notes:", e);
    }
  };

  const now = new Date();
  const isUpcoming = (b: Booking) => new Date(`${b.date}T${b.endTime || b.startTime}`) > now;

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status === "confirmed" && isUpcoming(b));
  const past = bookings.filter((b) =>
    b.status === "completed" || b.status === "declined" || b.status === "cancelled" ||
    (b.status === "confirmed" && !isUpcoming(b))
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pending Requests", count: pending.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "past", label: "Past", count: past.length },
  ];

  const currentList = tab === "pending" ? pending : tab === "upcoming" ? upcoming : past;
  const filtered = currentList.filter((b) =>
    b.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Bookings</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {pending.length > 0
                  ? `${pending.length} pending request${pending.length > 1 ? "s" : ""} need your attention`
                  : "View and manage your scheduled sessions"}
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-1">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                    ${tab === t.id
                      ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {t.label}
                  {t.count > 0 && (
                    <span className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold
                      ${t.id === "pending" && t.count > 0
                        ? "bg-amber-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search by student name..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none"
                />
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="font-medium text-gray-500 dark:text-gray-400">
                  {searchQuery ? "No bookings match your search" : `No ${tab} bookings`}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {tab === "pending" ? "New booking requests from students will appear here" :
                   tab === "upcoming" ? "Accepted bookings will show here" :
                   "Completed and declined sessions will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((b) => (
                  <div key={b.id}
                    className={`rounded-xl border p-5 transition-all ${
                      b.status === "pending"
                        ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"
                        : b.status === "confirmed"
                        ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20"
                        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
                    }`}>

                    {/* Top row: student info + status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${
                          b.status === "pending" ? "bg-amber-500" : "bg-[#2BB5A0]"
                        }`}>
                          {getInitials(b.studentName)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{b.studentName}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Student</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        b.status === "pending" ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" :
                        b.status === "confirmed" ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" :
                        b.status === "completed" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" :
                        "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    {/* Date/time */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(b.date, b.startTime)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      </span>
                    </div>

                    {/* Student message */}
                    {b.message && (
                      <div className="mt-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          <MessageSquare className="h-3 w-3" /> Student&apos;s message
                        </p>
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{b.message}</p>
                      </div>
                    )}

                    {/* Notes (for upcoming/past) */}
                    {tab !== "pending" && (
                      <div className="mt-3">
                        {editingNotes === b.id ? (
                          <div className="space-y-2">
                            <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Add session notes..."
                              rows={3}
                              className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none" />
                            <div className="flex gap-2">
                              <button onClick={() => saveNotes(b.id)}
                                className="rounded-lg bg-[#0F4F47] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1A7A6E]">
                                Save
                              </button>
                              <button onClick={() => { setEditingNotes(null); setNotesText(""); }}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : b.notes ? (
                          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><FileText className="mr-1 inline h-3 w-3" />Your notes</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{b.notes}</p>
                            <button onClick={() => { setEditingNotes(b.id); setNotesText(b.notes || ""); }}
                              className="mt-2 text-xs font-medium text-[#2BB5A0] hover:underline">Edit notes</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingNotes(b.id); setNotesText(""); }}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#2BB5A0]">
                            <Plus className="h-3 w-3" /> Add notes
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => handleAccept(b)}
                            disabled={actionLoading === b.id}
                            className="flex items-center gap-1.5 rounded-xl bg-[#0F4F47] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1A7A6E] disabled:opacity-50 active:scale-[0.97]">
                            <CheckCircle className="h-4 w-4" />
                            {actionLoading === b.id ? "Accepting..." : "Accept"}
                          </button>
                          <button onClick={() => handleDecline(b)}
                            disabled={actionLoading === b.id}
                            className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800 px-5 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 active:scale-[0.97]">
                            <XCircle className="h-4 w-4" />
                            Decline
                          </button>
                          <button onClick={() => router.push(`/counselor/inbox/${b.studentId}`)}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </button>
                        </>
                      )}
                      {b.status === "confirmed" && isUpcoming(b) && (
                        <>
                          <button onClick={() => handleMarkDone(b.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-[#2BB5A0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#249E8C] active:scale-[0.97]">
                            <CheckCircle className="h-4 w-4" />
                            Mark Done
                          </button>
                          <button onClick={() => router.push(`/counselor/inbox/${b.studentId}`)}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </button>
                        </>
                      )}
                      {(b.status === "completed" || b.status === "declined" || b.status === "cancelled") && (
                        <button onClick={() => router.push(`/counselor/inbox/${b.studentId}`)}
                          className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900">
                          <MessageSquare className="h-4 w-4" />
                          Chat with Student
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
