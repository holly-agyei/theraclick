"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface BookingRequest {
  id: string;
  studentId: string;
  studentName: string;
  requestedTimes: string[];
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  counselorId: string;
}

export default function CounselorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      if (!db || !bookingId) {
        setLoading(false);
        return;
      }

      try {
        const bookingDoc = await getDoc(doc(db, "bookingRequests", bookingId));
        if (!bookingDoc.exists()) {
          router.push("/counselor/bookings");
          return;
        }

        const data = bookingDoc.data();
        if (data.counselorId !== profile?.uid) {
          router.push("/counselor/bookings");
          return;
        }

        const studentDoc = await getDoc(doc(db, "users", data.studentId));
        const studentData = studentDoc.exists() ? studentDoc.data() : null;

        setBooking({
          id: bookingDoc.id,
          studentId: data.studentId,
          studentName: studentData?.anonymousEnabled && studentData?.anonymousId 
            ? studentData.anonymousId 
            : studentData?.fullName || "Student",
          requestedTimes: data.requestedTimes || [],
          message: data.message,
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate() || new Date(),
          counselorId: data.counselorId,
        });
      } catch (e) {
        console.error("Error loading booking:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadBooking();
  }, [bookingId, profile, router]);

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    if (!db || !booking) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "bookingRequests", booking.id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      setBooking({ ...booking, status: newStatus });
    } catch (e) {
      console.error("Error updating booking:", e);
      alert("Failed to update booking status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="mb-4 flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Bookings</span>
              </button>
              <h1 className="text-3xl font-bold text-white">Booking Request</h1>
            </div>

            {/* Booking Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                    {booking.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{booking.studentName}</h2>
                    <p className="text-sm text-gray-400">Student</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    booking.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                    booking.status === "rejected" ? "bg-red-500/20 text-red-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Requested: {booking.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Requested Times */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Requested Times</h3>
                </div>
                <div className="space-y-2 rounded-lg bg-white/5 p-4">
                  {booking.requestedTimes.length > 0 ? (
                    booking.requestedTimes.map((time, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-300">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        <span>{time}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No specific times requested</p>
                  )}
                </div>
              </div>

              {/* Message */}
              {booking.message && (
                <div className="mb-6">
                  <h3 className="mb-2 font-semibold text-white">Message from Student</h3>
                  <div className="rounded-lg bg-white/5 p-4">
                    <p className="text-gray-300">{booking.message}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {booking.status === "pending" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => handleStatusUpdate("approved")}
                    disabled={updating}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Approve Request
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={updating}
                    variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Reject Request
                  </Button>
                  <Button
                    onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                    variant="outline"
                    className="flex-1 border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat with Student
                  </Button>
                </div>
              )}

              {booking.status !== "pending" && (
                <Button
                  onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Chat with Student
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
