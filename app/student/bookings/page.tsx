"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle, X, User } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface Booking {
  id: string;
  counselorId: string;
  counselorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  message?: string;
  createdAt: Date;
}

export default function StudentBookingsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !db) {
      setLoading(false);
      return;
    }

    // Real-time listener for bookings
    // Note: This query requires a Firestore composite index on (studentId, date)
    // Create it at: https://console.firebase.google.com/v1/r/project/theracklick/firestore/indexes
    const q = query(
      collection(db, "bookings"),
      where("studentId", "==", profile.uid),
      orderBy("date", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const bookingsList: Booking[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Booking;
      });
      setBookings(bookingsList);
      setLoading(false);
    }, (error: any) => {
      console.error("Error loading bookings:", error);
      if (error?.code === "failed-precondition") {
        console.warn("Firestore index required. Please create the composite index for bookings collection.");
        // Silently handle - index will be created automatically via the link in console
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

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-[#F0FDF4]">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="mt-2 text-gray-500">View and manage your scheduled sessions</p>
            </div>

            {/* Upcoming Bookings */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                {upcomingBookings.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-green-200 bg-green-50 p-5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-3 flex items-center gap-3">
                                <div className="rounded-lg bg-green-100 p-2">
                                  <Calendar className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{booking.counselorName}</h3>
                                  <p className="text-sm text-gray-500">Counselor</p>
                                </div>
                              </div>
                              <div className="ml-11 space-y-1">
                                <p className="text-sm text-gray-700">{formatDate(booking.date, booking.startTime)}</p>
                                <p className="text-sm text-gray-500">
                                  {booking.startTime} - {booking.endTime}
                                </p>
                                {booking.message && (
                                  <p className="mt-2 text-sm text-gray-500 italic">"{booking.message}"</p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => markAsDone(booking.id)}
                              className="bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Done
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Bookings */}
                {pastBookings.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Past Sessions</h2>
                    <div className="space-y-3">
                      {pastBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-gray-200 bg-white p-5"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-gray-100 p-2">
                              <Clock className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{booking.counselorName}</h3>
                              <p className="text-sm text-gray-500">{formatDate(booking.date, booking.startTime)}</p>
                              {booking.status === "completed" && (
                                <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
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

                {upcomingBookings.length === 0 && pastBookings.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                    <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <p className="text-gray-500">No bookings yet</p>
                    <p className="mt-1 text-sm text-gray-500">Book a session with a counselor to get started</p>
                    <Button
                      onClick={() => router.push("/student/counselors")}
                      className="mt-4 bg-green-600 text-white hover:bg-green-700"
                    >
                      Browse Counselors
                    </Button>
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
