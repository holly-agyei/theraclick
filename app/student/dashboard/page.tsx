"use client";

import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Sun, 
  Cloud, 
  CloudRain, 
  Zap,
  Heart,
  Calendar,
  Clock,
  ArrowRight,
  Bell,
  BookOpen,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  Brain,
  Activity,
  Mail,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const moods = [
  { id: "great", icon: Sun, label: "Great", color: "from-amber-400 to-orange-400" },
  { id: "okay", icon: Cloud, label: "Okay", color: "from-sky-400 to-blue-400" },
  { id: "low", icon: CloudRain, label: "Low", color: "from-slate-400 to-gray-500" },
  { id: "stressed", icon: Zap, label: "Stressed", color: "from-purple-400 to-pink-400" },
];

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

  const displayName =
    profile?.role === "student" && profile.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : profile?.fullName?.split(" ")[0] || "there";

  // Load upcoming bookings
  useEffect(() => {
    if (!profile || !db) {
      setLoadingBookings(false);
      return;
    }

    // Query without orderBy first to avoid index requirement, then sort in memory
    const q = query(
      collection(db, "bookings"),
      where("studentId", "==", profile.uid),
      where("status", "==", "confirmed"),
      limit(10) // Get more to filter in memory
    );

    const unsub = onSnapshot(q, (snap) => {
      const bookings: UpcomingBooking[] = [];
      let soonest: UpcomingBooking | null = null;
      let soonestTime = Infinity;

      snap.docs.forEach((doc) => {
        const data = doc.data();
        const bookingDate = new Date(`${data.date}T${data.startTime}`);
        if (bookingDate > new Date()) {
          const booking: UpcomingBooking = {
            id: doc.id,
            counselorName: data.counselorName || "Counselor",
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
          };
          bookings.push(booking);
          
          // Check if this is the soonest (within 24 hours)
          const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursUntil > 0 && hoursUntil <= 24 && hoursUntil < soonestTime) {
            soonest = booking;
            soonestTime = hoursUntil;
          }
        }
      });

      // Sort by date in memory and take top 3
      bookings.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return dateA.getTime() - dateB.getTime();
      });

      setUpcomingBookings(bookings.slice(0, 3));
      setUpcomingSoon(soonest);
      setLoadingBookings(false);
    }, (error) => {
      console.error("Error loading bookings:", error);
      // If index error, log warning instead of crashing
      if (error.message && error.message.includes("index")) {
        console.warn("Firestore index required for bookings. Create it here: https://console.firebase.google.com/v1/r/project/theracklick/firestore/indexes?create_composite=Ckxwcm9qZWN0cy90aGVyYWNrbGljay9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYm9va2luZ3MvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJc3R1ZGVudElkEAEaCAoEZGF0ZRABGgwKCF9fbmFtZV9fEAE");
      }
      setLoadingBookings(false);
    });

    return () => unsub();
  }, [profile]);

  // Load recent conversations
  useEffect(() => {
    if (!profile || !db) {
      setLoadingConversations(false);
      return;
    }

    const conversationsList: RecentConversation[] = [];

    // Set up real-time listener on directMessages collection
    const unsub = onSnapshot(collection(db, "directMessages"), async (snap) => {
      conversationsList.length = 0;

      for (const convDoc of snap.docs) {
        const chatId = convDoc.id;
        const data = convDoc.data();
        const participants = data.participants as string[] | undefined;

        // Check if this conversation involves the student
        if (participants && Array.isArray(participants) && participants.includes(profile.uid) && db) {
          const otherUserId = participants.find(p => p !== profile.uid);

          if (otherUserId) {
            try {
              const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
              if (otherUserDoc.exists()) {
                const otherUserData = otherUserDoc.data();

                // Only show counselors and peer mentors
                if (otherUserData.role === "counselor" || otherUserData.role === "peer-mentor") {
                  conversationsList.push({
                    id: otherUserId,
                    name: otherUserData.fullName || "Unknown",
                    lastMessage: data.lastMessage?.slice(0, 50) || "No messages yet",
                    lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
                    type: otherUserData.role === "counselor" ? "counselor" : "peer-mentor",
                  });
                }
              }
            } catch (e) {
              console.error("Error fetching user data for conversation:", e);
            }
          }
        }
      }

      // Sort by last message time and take top 3
      conversationsList.sort((a, b) => {
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setRecentConversations(conversationsList.slice(0, 3));
      setLoadingConversations(false);
    }, (error) => {
      console.error("Error loading conversations:", error);
      setLoadingConversations(false);
    });

    return () => {
      unsub();
    };
  }, [profile]);

  const formatBookingDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getTimeUntil = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    const hours = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 1) {
      const mins = Math.floor((date.getTime() - Date.now()) / (1000 * 60));
      return `${mins} minutes`;
    }
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
  };


  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Ambient effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
          <div className="absolute -right-20 top-1/2 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Welcome back</span>
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Hey, {displayName} 👋
              </h1>
              <p className="mt-2 text-gray-400">
                How are you feeling today?
              </p>
            </div>

            {/* Upcoming Session Alert */}
            {upcomingSoon && (
              <div className="group relative mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-orange-500/20 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/20">
                {/* Animated background */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-amber-500/30 blur-3xl animate-pulse" />
                <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-orange-500/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className="rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/40 p-3 shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                    <Bell className="h-6 w-6 text-amber-200" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-lg">Upcoming Session Soon!</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-100">
                      You have a session with <span className="font-semibold text-white">{upcomingSoon.counselorName}</span> in <span className="font-semibold text-amber-300">{getTimeUntil(upcomingSoon.date, upcomingSoon.startTime)}</span>
                    </p>
                    <p className="mt-2.5 flex items-center gap-2 text-sm text-gray-300">
                      <Clock className="h-3.5 w-3.5" />
                      {formatBookingDate(upcomingSoon.date, upcomingSoon.startTime)}
                    </p>
                    <Button
                      onClick={() => router.push("/student/bookings")}
                      className="mt-4 bg-gradient-to-r from-amber-500/40 to-orange-500/40 text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:from-amber-500/50 hover:to-orange-500/50 hover:shadow-xl hover:shadow-amber-500/30"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Mood Check-in */}
            <div className="group relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-white/3 p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-white/5">
              {/* Subtle animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <div className="relative z-10">
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-sm font-semibold text-gray-200">Quick check-in</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {moods.map((mood, idx) => {
                    const Icon = mood.icon;
                    const isSelected = selectedMood === mood.id;
                    return (
                      <button
                        key={mood.id}
                        onClick={() => handleMoodSelect(mood.id)}
                        className={`group/mood relative flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? `border-white/40 bg-gradient-to-br ${mood.color} shadow-xl shadow-black/20 scale-105`
                            : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 hover:scale-[1.02]"
                        }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Selected glow effect */}
                        {isSelected && (
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${mood.color} opacity-20 blur-xl animate-pulse`} />
                        )}
                        <Icon className={`relative z-10 h-7 w-7 transition-all duration-300 ${
                          isSelected 
                            ? "text-white scale-110" 
                            : "text-gray-400 group-hover/mood:text-white group-hover/mood:scale-110"
                        }`} />
                        <span className={`relative z-10 text-xs font-semibold transition-colors duration-300 ${
                          isSelected ? "text-white" : "text-gray-400 group-hover/mood:text-white"
                        }`}>
                          {mood.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedMood && (
                  <div className="mt-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                      <p className="text-center text-sm font-medium text-gray-200 leading-relaxed">
                        {selectedMood === "great" && "That's wonderful! Keep that energy going. ✨"}
                        {selectedMood === "okay" && "Thanks for checking in. We're here if you need anything."}
                        {selectedMood === "low" && "It's okay to feel this way. Would you like to talk?"}
                        {selectedMood === "stressed" && "Take a breath. Let's work through this together."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Upcoming Sessions</h2>
                  <button
                    onClick={() => router.push("/student/bookings")}
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500/20 p-2">
                          <Calendar className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{booking.counselorName}</p>
                          <p className="text-sm text-gray-400">{formatBookingDate(booking.date, booking.startTime)}</p>
                        </div>
                        <Clock className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources & Tips Grid */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {/* Inbox - Recent Conversations */}
              <button
                onClick={() => router.push("/student/inbox")}
                className="group relative w-full overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 p-6 backdrop-blur-sm text-left transition-all duration-300 hover:border-emerald-500/40 hover:from-emerald-500/20 hover:via-emerald-500/10 hover:to-teal-500/20 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                {/* Animated background gradient */}
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 p-2.5 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <Mail className="h-5 w-5 text-emerald-300" />
                      </div>
                      <h3 className="font-semibold text-white text-lg">My Inbox</h3>
                    </div>
                    <span className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5 transition-all duration-300">
                      View all
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                  {loadingConversations ? (
                    <div className="space-y-2.5">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-emerald-500/10 border border-emerald-500/10" />
                      ))}
                    </div>
                  ) : recentConversations.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                        <MessageCircle className="h-6 w-6 text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-300">No conversations yet</p>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Start chatting with a counselor or peer mentor
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recentConversations.map((conv, idx) => (
                        <div
                          key={conv.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              conv.type === "counselor" 
                                ? `/student/counselors/${conv.id}`
                                : `/student/peer-mentors/${conv.id}`
                            );
                          }}
                          className="group/item cursor-pointer w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-left transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/10"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full shadow-lg ${
                              conv.type === "counselor" ? "bg-blue-400 shadow-blue-400/50" : "bg-emerald-400 shadow-emerald-400/50"
                            } animate-pulse`} />
                            <span className="flex-1 truncate text-sm font-semibold text-white">
                              {conv.name}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              conv.type === "counselor" 
                                ? "bg-blue-500/20 text-blue-300" 
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}>
                              {conv.type === "counselor" ? "Counselor" : "Mentor"}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-1 text-xs text-gray-400 group-hover/item:text-gray-300 transition-colors">
                            {conv.lastMessage}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {/* Daily Tips */}
              <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:from-amber-500/20 hover:via-amber-500/10 hover:to-orange-500/20 hover:shadow-lg hover:shadow-amber-500/20">
                {/* Animated background */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 p-2.5 shadow-lg shadow-amber-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                      <Lightbulb className="h-5 w-5 text-amber-300" />
                    </div>
                    <h3 className="font-semibold text-white text-lg">Today's Tip</h3>
                  </div>
                  <div className="relative">
                    <p className="text-sm leading-relaxed text-gray-200 font-medium">
                      "Take a 5-minute break every hour. Your brain needs rest to process information effectively. Step away, breathe, and come back refreshed."
                    </p>
                    <div className="absolute -left-2 top-0 h-full w-0.5 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full opacity-50" />
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs font-medium text-amber-400">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <span>Updated daily</span>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-pink-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/40 hover:from-purple-500/20 hover:via-purple-500/10 hover:to-pink-500/20 hover:shadow-lg hover:shadow-purple-500/20">
                {/* Animated background */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 p-2.5 shadow-lg shadow-purple-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <TrendingUp className="h-5 w-5 text-purple-300" />
                    </div>
                    <h3 className="font-semibold text-white text-lg">Stay Motivated</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-300 font-medium">
                    Inspiring content to keep you moving forward.
                  </p>
                  <a
                    href="https://www.ted.com/topics/mental-health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/15 p-3.5 text-sm font-medium text-white transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/25 hover:shadow-md hover:shadow-purple-500/20"
                  >
                    <span className="flex items-center gap-2">
                      <span>Watch TED Talks on Mental Health</span>
                    </span>
                    <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                </div>
              </div>

              {/* Mindfulness */}
              <div className="group relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-cyan-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-teal-500/40 hover:from-teal-500/20 hover:via-teal-500/10 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-teal-500/20">
                {/* Animated background */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-teal-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-teal-500/30 to-cyan-500/30 p-2.5 shadow-lg shadow-teal-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <Brain className="h-5 w-5 text-teal-300" />
                    </div>
                    <h3 className="font-semibold text-white text-lg">Mindfulness</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-300 font-medium">
                    Quick exercises to center yourself and reduce stress.
                  </p>
                  <a
                    href="https://www.headspace.com/meditation/meditation-for-beginners"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center justify-between rounded-xl border border-teal-500/30 bg-teal-500/15 p-3.5 text-sm font-medium text-white transition-all duration-200 hover:border-teal-500/50 hover:bg-teal-500/25 hover:shadow-md hover:shadow-teal-500/20"
                  >
                    <span>Meditation for Beginners</span>
                    <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Support reminder */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:from-emerald-500/20 hover:via-emerald-500/10 hover:to-teal-500/20 hover:shadow-lg hover:shadow-emerald-500/20">
              {/* Animated background */}
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
              <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-50" />
              
              <div className="relative z-10 flex items-start gap-4">
                <div className="rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 p-3 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  <Heart className="h-5 w-5 text-emerald-300 fill-emerald-300/20" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-lg">You're not alone</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    Support is available 24/7. Reach out whenever you need someone to talk to.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
