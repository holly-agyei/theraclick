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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Bookings</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Booking Request</h1>
            </div>

            {/* Booking Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {booking.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{booking.studentName}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    booking.status === "approved" ? "bg-green-100 dark:bg-green-900 text-green-600" :
                    booking.status === "rejected" ? "bg-red-100 dark:bg-red-900 text-red-600" :
                    "bg-amber-100 dark:bg-amber-900 text-amber-600"
                  }`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Requested: {booking.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Requested Times */}
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Requested Times</h3>
                </div>
                <div className="space-y-2 rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  {booking.requestedTimes.length > 0 ? (
                    booking.requestedTimes.map((time, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <span>{time}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No specific times requested</p>
                  )}
                </div>
              </div>

              {/* Message */}
              {booking.message && (
                <div className="mb-6">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Message from Student</h3>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                    <p className="text-gray-700 dark:text-gray-300">{booking.message}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              {booking.status === "pending" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => handleStatusUpdate("approved")}
                    disabled={updating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Approve Request
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={updating}
                    variant="outline"
                    className="flex-1 border-red-300 dark:border-red-800 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Reject Request
                  </Button>
                  <Button
                    onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                    variant="outline"
                    className="flex-1 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat with Student
                  </Button>
                </div>
              )}

              {booking.status !== "pending" && (
                <Button
                  onClick={() => router.push(`/counselor/inbox/${booking.studentId}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
