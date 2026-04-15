"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MessageCircle, Calendar, Clock,
  CheckCircle, AlertCircle, Star, Users, Shield,
} from "lucide-react";
import { doc, getDoc, collection, addDoc, query, where, orderBy, serverTimestamp, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { sendNotification, notifyCounselorNewBooking } from "@/lib/notify";

interface Counselor {
  uid: string;
  fullName: string;
  email?: string;
  specialization?: string;
  about?: string;
  sessionsCompleted?: number;
  availability?: string[];
  isOnline?: boolean;
  avatar?: string | null;
}

interface BookingRequest {
  id: string;
  studentId: string;
  counselorId: string;
  preferredTimes: string[];
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

export default function CounselorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const counselorId = params.id as string;

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [existingRequest, setExistingRequest] = useState<BookingRequest | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

  useEffect(() => {
    async function loadCounselor() {
      try {
        if (db) {
          const docSnap = await getDoc(doc(db, "users", counselorId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCounselor({
              uid: docSnap.id,
              fullName: data.fullName,
              email: data.email,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              sessionsCompleted: data.sessionsCompleted || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as Counselor);
          }
        }
      } catch (e) {
        console.error(e);
        setCounselor(null);
      } finally {
        setLoading(false);
      }
    }
    void loadCounselor();
  }, [counselorId]);

  useEffect(() => {
    async function loadAvailability() {
      if (!db) return;
      try {
        const snap = await getDoc(doc(db, "counselorAvailability", counselorId));
        if (snap.exists()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const slots = (snap.data().slots || []).filter((s: any) => !s.isBooked);
          setAvailabilitySlots(slots);
        }
      } catch (e) { console.error(e); }
    }
    void loadAvailability();
  }, [counselorId]);

  useEffect(() => {
    async function checkRequest() {
      if (!profile || !db) return;
      try {
        const q = query(
          collection(db, "bookings"),
          where("studentId", "==", profile.uid),
          where("counselorId", "==", counselorId),
          where("status", "in", ["pending", "confirmed"])
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setExistingRequest({ id: snap.docs[0].id, ...data, createdAt: data.createdAt?.toDate() || new Date() } as BookingRequest);
        }
      } catch (e) { console.error(e); }
    }
    void checkRequest();
  }, [profile, counselorId]);

  const submitBookingRequest = async () => {
    if (!profile || !db || !selectedSlot) return;
    setBookingStatus("sending");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slot = availabilitySlots.find((s: any) => s.id === selectedSlot);
      if (!slot) return;

      await addDoc(collection(db, "bookings"), {
        studentId: profile.uid,
        studentName: profile.anonymousEnabled && profile.anonymousId ? profile.anonymousId : profile.fullName,
        counselorId,
        counselorName: counselor?.fullName,
        slotId: selectedSlot,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        message: bookingMessage,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const availabilityRef = doc(db, "counselorAvailability", counselorId);
      const availabilitySnap = await getDoc(availabilityRef);
      if (availabilitySnap.exists()) {
        const data = availabilitySnap.data();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedSlots = (data.slots || []).map((s: any) =>
          s.id === selectedSlot ? { ...s, isBooked: true } : s
        );
        await setDoc(availabilityRef, { slots: updatedSlots, updatedAt: serverTimestamp() }, { merge: true });
      }

      setBookingStatus("sent");

      if (profile?.email) {
        const [h, m] = slot.startTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const timeStr = `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;
        const dateObj = new Date(`${slot.date}T${slot.startTime}`);
        const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        const appUrl = window.location.origin;

        sendNotification({
          userId: profile.uid, userEmail: profile.email, userName: profile.fullName || "",
          type: "booking_confirmed",
          subject: `Booking request sent to ${counselor?.fullName || "your counselor"}`,
          body: `Your session request for ${dateStr} at ${timeStr} with ${counselor?.fullName || "your counselor"} has been submitted.\n\nThe counselor will review your request and accept or decline it. You'll be notified once they respond.`,
          ctaText: "View Bookings",
          ctaUrl: `${appUrl}/student/bookings`,
        });

        if (counselor?.email) {
          notifyCounselorNewBooking(
            counselorId, counselor.email, counselor.fullName || "",
            profile.fullName || "A student",
            `${dateStr} at ${timeStr}`, bookingMessage, appUrl
          );
        }
      }
    } catch (e) {
      console.error(e);
      setBookingStatus("idle");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatSlotDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const initials = counselor?.fullName?.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F4F47] border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!counselor) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <p>Counselor not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go back</Button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-2xl">

            {/* Back */}
            <button onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to counselors
            </button>

            {/* Profile Card */}
            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {counselor.avatar ? (
                    <img src={counselor.avatar} alt={counselor.fullName} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F4F47] text-lg font-bold text-white">
                      {initials}
                    </div>
                  )}
                  {counselor.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-gray-950 bg-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{counselor.fullName}</h1>
                  {counselor.specialization && (
                    <p className="mt-0.5 text-[14px] text-[#2BB5A0] font-medium">{counselor.specialization}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                    {counselor.sessionsCompleted != null && counselor.sessionsCompleted > 0 && (
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {counselor.sessionsCompleted} sessions</span>
                    )}
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Verified</span>
                    <span className={`flex items-center gap-1 ${counselor.isOnline ? "text-green-600" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${counselor.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                      {counselor.isOnline ? "Online now" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-5">
                <a href="#booking"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4F47] px-4 py-3 text-[13px] font-bold text-white hover:bg-[#1A7A6E] transition-colors">
                  <Calendar className="h-4 w-4" /> Book a Session
                </a>
              </div>
            </div>

            {/* About */}
            {counselor.about && (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">About</h3>
                <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">{counselor.about}</p>
              </div>
            )}

            {/* Booking Section */}
            <div id="booking" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Book a Session</h2>

              {existingRequest && (
                <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[14px] font-semibold text-amber-800 dark:text-amber-200">Request Pending</p>
                      <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-300">
                        You already have a pending request. {counselor.fullName} will respond soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bookingStatus === "sent" ? (
                <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 text-center">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Request Sent!</h3>
                  <p className="mt-2 text-[14px] text-gray-500 dark:text-gray-400">
                    {counselor.fullName} will review your request and get back to you.
                  </p>
                  <button onClick={() => router.push("/student/bookings")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
                    View My Bookings
                  </button>
                </div>
              ) : (
                <>
                  {/* Available Slots */}
                  <div className="mb-5 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#0F4F47]" />
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Available Time Slots</h3>
                    </div>

                    {availabilitySlots.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {availabilitySlots.map((slot: any) => (
                          <button key={slot.id} onClick={() => setSelectedSlot(slot.id)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                              selectedSlot === slot.id
                                ? "border-[#2BB5A0] bg-[#2BB5A0]/10 text-[#0F4F47]"
                                : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                            }`}>
                            <p className="text-[14px] font-semibold">{formatSlotDate(slot.date, slot.startTime)}</p>
                            <p className="text-[12px] opacity-70">{slot.startTime} - {slot.endTime}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">
                          {counselor.fullName} hasn&apos;t added available times yet.
                          You can still request a session — they&apos;ll reach out to coordinate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="mb-5">
                    <label className="mb-2 block text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                      Add a message (optional)
                    </label>
                    <textarea
                      placeholder="Briefly describe what you'd like to discuss..."
                      value={bookingMessage} onChange={(e) => setBookingMessage(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none" />
                  </div>

                  {/* Submit */}
                  <Button onClick={submitBookingRequest}
                    disabled={!selectedSlot || bookingStatus === "sending" || !!existingRequest}
                    className="w-full rounded-xl bg-[#0F4F47] hover:bg-[#1A7A6E] text-white py-6 text-base font-semibold">
                    {bookingStatus === "sending" ? "Booking..." : selectedSlot ? "Book This Slot" : "Select a Time Slot"}
                  </Button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
