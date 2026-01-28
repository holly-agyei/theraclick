"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, FileText, Plus } from "lucide-react";
import { collection, getDocs, query, orderBy, doc, getDoc, where, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  message?: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: Date;
}

export default function CounselorBookingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    if (!profile || !db) {
      setLoading(false);
      return;
    }

    // Real-time listener for bookings
    // Note: This query requires a Firestore composite index on (counselorId, date)
    // Create it at: https://console.firebase.google.com/v1/r/project/theracklick/firestore/indexes
    const q = query(
      collection(db, "bookings"),
      where("counselorId", "==", profile.uid),
      orderBy("date", "asc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const bookingsList: Booking[] = [];
      
      if (!db) {
        setLoading(false);
        return;
      }
      
      for (const bookingDoc of snap.docs) {
        const data = bookingDoc.data();
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
          message: data.message,
          notes: data.notes,
          status: data.status || "confirmed",
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      }
      
      setBookings(bookingsList);
      setLoading(false);
    }, (error: any) => {
      console.error("Error loading bookings:", error);
      if (error?.code === "failed-precondition") {
        console.warn("Firestore index required. Please create the composite index for bookings collection.");
        console.warn("Click this link to create the index:", error.message?.match(/https:\/\/[^\s]+/)?.[0] || "https://console.firebase.google.com/project/theracklick/firestore/indexes");
        // Silently handle - index will be created automatically via the link in console
      } else if (error?.code === "cancelled" || error?.name === "AbortError") {
        console.warn("Bookings query was cancelled/aborted");
      }
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const markAsDone = async (bookingId: string) => {
    if (!db || !confirm("Mark this meeting as completed?")) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "completed",
        completedAt: new Date(),
      });
    } catch (e) {
      console.error("Error marking as done:", e);
      alert("Failed to update booking");
    }
  };

  const saveNotes = async (bookingId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        notes: notesText.trim(),
        notesUpdatedAt: new Date(),
      });
      setEditingNotes(null);
      setNotesText("");
    } catch (e) {
      console.error("Error saving notes:", e);
      alert("Failed to save notes");
    }
  };

  const startEditingNotes = (booking: Booking) => {
    setEditingNotes(booking.id);
    setNotesText(booking.notes || "");
  };

  const formatDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const isUpcoming = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.endTime}`);
    return bookingDateTime > new Date() && booking.status === "confirmed";
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter(b => !isUpcoming(b) || b.status === "completed");

  const filteredUpcoming = upcomingBookings.filter((b) =>
    b.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPast = pastBookings.filter((b) =>
    b.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">My Bookings</h1>
              <p className="mt-2 text-gray-400">View and manage your scheduled sessions</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Upcoming Bookings */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : (
              <>
                {filteredUpcoming.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-white">Upcoming Sessions</h2>
                    <div className="space-y-3">
                      {filteredUpcoming.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-3 flex items-center gap-3">
                                <div className="rounded-lg bg-emerald-500/20 p-2">
                                  <Calendar className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{booking.studentName}</h3>
                                  <p className="text-sm text-gray-400">Student</p>
                                </div>
                              </div>
                              <div className="ml-11 space-y-1">
                                <p className="text-sm text-gray-300">{formatDate(booking.date, booking.startTime)}</p>
                                <p className="text-sm text-gray-400">
                                  {booking.startTime} - {booking.endTime}
                                </p>
                                {booking.message && (
                                  <p className="mt-2 text-sm text-gray-400 italic">"{booking.message}"</p>
                                )}
                                {/* Meeting Notes */}
                                <div className="mt-4">
                                  {editingNotes === booking.id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={notesText}
                                        onChange={(e) => setNotesText(e.target.value)}
                                        placeholder="Add meeting notes..."
                                        rows={3}
                                        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => saveNotes(booking.id)}
                                          size="sm"
                                          className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                        >
                                          Save Notes
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setEditingNotes(null);
                                            setNotesText("");
                                          }}
                                          size="sm"
                                          variant="outline"
                                          className="border-white/10 text-gray-300"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      {booking.notes ? (
                                        <div className="rounded-lg bg-white/5 p-3">
                                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{booking.notes}</p>
                                          <Button
                                            onClick={() => startEditingNotes(booking)}
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 border-white/10 text-gray-400 hover:bg-white/10"
                                          >
                                            <FileText className="mr-1 h-3 w-3" />
                                            Edit Notes
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          onClick={() => startEditingNotes(booking)}
                                          size="sm"
                                          variant="outline"
                                          className="border-white/10 text-gray-400 hover:bg-white/10"
                                        >
                                          <Plus className="mr-1 h-3 w-3" />
                                          Add Notes
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => markAsDone(booking.id)}
                                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Done
                              </Button>
                              <Button
                                onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                                variant="outline"
                                className="border-white/10 text-gray-300 hover:bg-white/10"
                              >
                                Chat
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Bookings */}
                {filteredPast.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-lg font-semibold text-white">Past Sessions</h2>
                    <div className="space-y-3">
                      {filteredPast.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-white/10 bg-white/5 p-5"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-gray-500/20 p-2">
                              <Clock className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{booking.studentName}</h3>
                              <p className="text-sm text-gray-400">{formatDate(booking.date, booking.startTime)}</p>
                              {booking.status === "completed" && (
                                <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredUpcoming.length === 0 && filteredPast.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                    <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                    <p className="text-gray-400">
                      {searchQuery ? "No bookings found" : "No bookings yet"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchQuery ? "Try a different search term" : "Students will book your available time slots"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
