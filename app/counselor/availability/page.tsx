"use client";

import { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Plus, Trash2, Save } from "lucide-react";
import { collection, doc, getDoc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { serverTimestamp } from "firebase/firestore";

interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isBooked?: boolean;
}

export default function CounselorAvailabilityPage() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || !db) {
      setLoading(false);
      return;
    }

    // Load availability slots
    const availabilityRef = doc(db, "counselorAvailability", profile.uid);
    const unsub = onSnapshot(availabilityRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSlots(data.slots || []);
      } else {
        setSlots([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const addSlot = async () => {
    if (!newDate || !newStartTime || !newEndTime || !profile || !db) return;
    if (newStartTime >= newEndTime) {
      alert("End time must be after start time");
      return;
    }

    setSaving(true);
    try {
      const availabilityRef = doc(db, "counselorAvailability", profile.uid);
      const newSlot: AvailabilitySlot = {
        id: Date.now().toString(),
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        isBooked: false,
      };

      const currentData = (await getDoc(availabilityRef)).data();
      const currentSlots = currentData?.slots || [];
      
      // Check for conflicts
      const hasConflict = currentSlots.some((slot: AvailabilitySlot) => {
        if (slot.date !== newDate || slot.isBooked) return false;
        const slotStart = `${slot.date}T${slot.startTime}`;
        const slotEnd = `${slot.date}T${slot.endTime}`;
        const newStart = `${newDate}T${newStartTime}`;
        const newEnd = `${newDate}T${newEndTime}`;
        return (newStart >= slotStart && newStart < slotEnd) || 
               (newEnd > slotStart && newEnd <= slotEnd) ||
               (newStart <= slotStart && newEnd >= slotEnd);
      });

      if (hasConflict) {
        alert("This time slot conflicts with an existing availability slot");
        setSaving(false);
        return;
      }

      await setDoc(availabilityRef, {
        counselorId: profile.uid,
        slots: [...currentSlots, newSlot],
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setNewDate("");
      setNewStartTime("");
      setNewEndTime("");
    } catch (e) {
      console.error("Error adding slot:", e);
      alert("Failed to add availability slot");
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (slotId: string) => {
    if (!profile || !db) return;
    if (!confirm("Are you sure you want to remove this availability slot?")) return;

    try {
      const availabilityRef = doc(db, "counselorAvailability", profile.uid);
      const currentData = (await getDoc(availabilityRef)).data();
      const currentSlots = currentData?.slots || [];
      
      await setDoc(availabilityRef, {
        slots: currentSlots.filter((slot: AvailabilitySlot) => slot.id !== slotId),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error("Error removing slot:", e);
      alert("Failed to remove availability slot");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  const isPastSlot = (slot: AvailabilitySlot) => {
    const slotDateTime = new Date(`${slot.date}T${slot.endTime}`);
    return slotDateTime < new Date();
  };

  const upcomingSlots = slots.filter(s => !isPastSlot(s) && !s.isBooked).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const bookedSlots = slots.filter(s => s.isBooked).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const pastSlots = slots.filter(s => isPastSlot(s) && !s.isBooked);

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Availability</h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Set your available time slots for students to book</p>
            </div>

            {/* Add New Slot */}
            <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Add Availability Slot</h2>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addSlot}
                    disabled={!newDate || !newStartTime || !newEndTime || saving}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Slot
                  </Button>
                </div>
              </div>
            </div>

            {/* Upcoming Available Slots */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950" />
                ))}
              </div>
            ) : (
              <>
                {upcomingSlots.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Available Slots</h2>
                    <div className="space-y-3">
                      {upcomingSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-3">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(slot.date)}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {slot.startTime} - {slot.endTime}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => removeSlot(slot.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-300 dark:border-red-800 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Booked Slots */}
                {bookedSlots.length > 0 && (
                  <div className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Booked Slots</h2>
                    <div className="space-y-3">
                      {bookedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-green-100 dark:bg-green-900 p-3">
                              <Clock className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{formatDate(slot.date)}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {slot.startTime} - {slot.endTime}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-green-100 dark:bg-green-900 px-3 py-1 text-xs font-medium text-green-600">
                            Booked
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {upcomingSlots.length === 0 && bookedSlots.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-12 text-center">
                    <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">No availability slots yet</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add slots above for students to book</p>
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
