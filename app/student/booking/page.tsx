"use client";

import { useState } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Video, ArrowRight } from "lucide-react";

interface Counselor {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  avatar?: string;
}

interface TimeSlot {
  id: string;
  time: string;
  date: string;
  available: boolean;
}

const mockCounselors: Counselor[] = [
  {
    id: "1",
    name: "Dr. Sarah Mensah",
    specialty: "Anxiety & Stress Management",
    bio: "Licensed counselor specializing in student mental health",
  },
  {
    id: "2",
    name: "Dr. Kwame Asante",
    specialty: "Academic Performance & Career",
    bio: "Experienced in helping students navigate academic challenges",
  },
  {
    id: "3",
    name: "Dr. Ama Boateng",
    specialty: "Relationships & Social Support",
    bio: "Focused on building healthy relationships and communication",
  },
];

const mockTimeSlots: TimeSlot[] = [
  { id: "1", date: "Today", time: "2:00 PM", available: true },
  { id: "2", date: "Today", time: "4:00 PM", available: true },
  { id: "3", date: "Tomorrow", time: "10:00 AM", available: true },
  { id: "4", date: "Tomorrow", time: "2:00 PM", available: false },
  { id: "5", date: "Tomorrow", time: "4:00 PM", available: true },
];

export default function BookingPage() {
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const handleBookSession = () => {
    if (selectedCounselor && selectedSlot) {
      // In a real app, this would create a booking
      alert(
        `Booking confirmed with ${selectedCounselor.name} on ${selectedSlot.date} at ${selectedSlot.time}`
      );
    }
  };

  return (
    <LayoutWrapper>
      <div className="bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-8 md:py-6">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Book a Session</h1>
          <p className="mt-2 text-base text-gray-600 md:text-lg">
            Schedule time with a counselor or peer mentor
          </p>
        </div>

        <div className="px-4 py-6 md:px-8 md:py-8">
          {!selectedCounselor ? (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Counselor List */}
              <div className="lg:col-span-2">
                <h2 className="mb-6 text-xl font-semibold text-gray-900 md:text-2xl">
                  Available Counselors
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  {mockCounselors.map((counselor) => (
                    <Card
                      key={counselor.id}
                      className="cursor-pointer border-gray-200 transition-shadow hover:shadow-lg"
                      onClick={() => setSelectedCounselor(counselor)}
                    >
                      <CardContent className="p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 md:h-16 md:w-16">
                            <User className="h-7 w-7 text-primary-600 md:h-8 md:w-8" />
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-1 text-lg font-semibold text-gray-900 md:text-xl">
                              {counselor.name}
                            </h3>
                            <p className="mb-2 text-base font-medium text-primary-600 md:text-lg">
                              {counselor.specialty}
                            </p>
                            <p className="text-sm text-gray-600 md:text-base">
                              {counselor.bio}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-6 w-6 shrink-0 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Peer Mentors Section */}
              <div className="lg:sticky lg:top-8 lg:h-fit">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 md:text-2xl">
                  Peer Mentors
                </h2>
                <Card className="border-gray-200">
                  <CardContent className="p-5 md:p-6">
                    <p className="mb-4 text-sm text-gray-600 md:text-base">
                      Connect with trained peer mentors who understand what
                      you&apos;re going through. Peer mentors are available for
                      informal support and can help you decide if you need to
                      speak with a professional counselor.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full md:text-base md:h-11"
                      onClick={() => {
                        alert("Peer mentor booking coming soon");
                      }}
                    >
                      View Peer Mentors
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl">
              {/* Time Slot Selection */}
              <div className="mb-8">
                <button
                  onClick={() => setSelectedCounselor(null)}
                  className="mb-6 text-base text-primary-600 hover:text-primary-700 md:text-lg"
                >
                  ← Back to counselors
                </button>
                <Card className="mb-8 border-primary-200 bg-primary-50">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <User className="mt-0.5 h-6 w-6 text-primary-600 md:h-7 md:w-7" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 md:text-xl">
                          {selectedCounselor.name}
                        </h3>
                        <p className="text-base text-primary-600 md:text-lg">
                          {selectedCounselor.specialty}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h2 className="mb-6 text-xl font-semibold text-gray-900 md:text-2xl">
                  Available Times
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {mockTimeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                      disabled={!slot.available}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selectedSlot?.id === slot.id
                          ? "border-primary-400 bg-primary-50"
                          : slot.available
                          ? "border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50"
                          : "border-gray-100 bg-gray-50 opacity-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 md:text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{slot.date}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium text-gray-900 md:text-lg">
                        <Clock className="h-5 w-5" />
                        <span>{slot.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Info */}
              {selectedSlot && (
                <div className="mb-8 grid gap-6 md:grid-cols-2">
                  <Card className="border-gray-200">
                    <CardContent className="p-5 md:p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 md:text-xl">
                        Session Details
                      </h3>
                      <div className="space-y-3 text-sm text-gray-600 md:text-base">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5" />
                          <span>{selectedCounselor.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5" />
                          <span>
                            {selectedSlot.date} at {selectedSlot.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5" />
                          <span>Video session (link will be shared)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Book Button */}
              <Button
                size="lg"
                className="w-full bg-primary-400 text-white hover:bg-primary-500 disabled:opacity-50 md:w-auto md:px-8 md:text-lg"
                onClick={handleBookSession}
                disabled={!selectedSlot}
              >
                Confirm Booking
              </Button>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}

