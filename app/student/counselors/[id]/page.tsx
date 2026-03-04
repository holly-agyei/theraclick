"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MessageCircle,
  Calendar,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Mic,
  MicOff,
  X,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
} from "lucide-react";
import { doc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { useCall } from "@/context/callContext";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

interface Counselor {
  uid: string;
  fullName: string;
  specialization?: string;
  about?: string;
  sessionsCompleted?: number;
  availability?: string[];
  isOnline?: boolean;
  avatar?: string | null;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  audioUrl?: string;
  type?: "text" | "call";
  callType?: "voice" | "video";
  callStatus?: "missed" | "outgoing" | "incoming" | "rejected" | "ended";
  callDuration?: number;
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

// Demo data
const demoCounselors: Record<string, Counselor> = {
  "demo-1": {
    uid: "demo-1",
    fullName: "Dr. Akosua Mensah",
    specialization: "Anxiety & Stress Management",
    about: "I specialize in helping students manage academic stress and anxiety. With over 8 years of experience working with university students, I understand the unique pressures you face. My approach is warm, non-judgmental, and focused on practical strategies you can use right away.",
    sessionsCompleted: 342,
    isOnline: true,
    availability: ["Monday 9AM-5PM", "Wednesday 9AM-5PM", "Friday 9AM-12PM"],
  },
  "demo-2": {
    uid: "demo-2",
    fullName: "Dr. Kwame Asante",
    specialization: "Depression & Mood Disorders",
    about: "I'm passionate about supporting young people through difficult times. My trauma-informed approach creates a safe space where you can explore your feelings without judgment.",
    sessionsCompleted: 256,
    isOnline: false,
    availability: ["Tuesday 10AM-6PM", "Thursday 10AM-6PM"],
  },
  "demo-3": {
    uid: "demo-3",
    fullName: "Dr. Ama Boateng",
    specialization: "Relationships & Family",
    about: "Expert in relationship counseling and family dynamics. I believe in creating safe spaces for growth and healing.",
    sessionsCompleted: 189,
    isOnline: true,
    availability: ["Monday 2PM-8PM", "Wednesday 2PM-8PM", "Saturday 10AM-2PM"],
  },
  "demo-4": {
    uid: "demo-4",
    fullName: "Dr. Kofi Adjei",
    specialization: "Academic Performance",
    about: "Helping students overcome procrastination and build healthy study habits. Let's unlock your potential together.",
    sessionsCompleted: 421,
    isOnline: false,
    availability: [],
  },
};

type Tab = "chat" | "book";

export default function CounselorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { initiateCall, isInCall } = useCall();
  const counselorId = params.id as string;

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Booking state
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [existingRequest, setExistingRequest] = useState<BookingRequest | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

  // Load counselor
  useEffect(() => {
    async function loadCounselor() {
      try {
        if (db && !counselorId.startsWith("demo-")) {
          const docSnap = await getDoc(doc(db, "users", counselorId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCounselor({ 
              uid: docSnap.id, 
              fullName: data.fullName,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              sessionsCompleted: data.sessionsCompleted || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as Counselor);
          }
        } else {
          setCounselor(demoCounselors[counselorId] || null);
        }
      } catch (e) {
        console.error(e);
        setCounselor(demoCounselors[counselorId] || null);
      } finally {
        setLoading(false);
      }
    }
    void loadCounselor();
  }, [counselorId]);

  // Load chat messages (real-time)
  useEffect(() => {
    if (!profile || !db) return;
    
    const chatId = [profile.uid, counselorId].sort().join("_");
    const q = query(
      collection(db, "directMessages", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          audioUrl: data.audioUrl || undefined,
        } as Message;
      });
      setMessages(msgs);
    });

    return () => unsub();
  }, [profile, counselorId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load availability slots
  useEffect(() => {
    async function loadAvailability() {
      if (!db || counselorId.startsWith("demo-")) return;
      try {
        const availabilityRef = doc(db, "counselorAvailability", counselorId);
        const snap = await getDoc(availabilityRef);
        if (snap.exists()) {
          const data = snap.data();
          const availableSlots = (data.slots || []).filter((slot: any) => !slot.isBooked);
          setAvailabilitySlots(availableSlots);
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadAvailability();
  }, [counselorId]);

  // Check existing booking request
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
          setExistingRequest({
            id: snap.docs[0].id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as BookingRequest);
        }
      } catch (e) {
        console.error(e);
      }
    }
    void checkRequest();
  }, [profile, counselorId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = "";
      for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"]) {
        if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const finalType = mimeType || mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob.size > 0 ? blob : null);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.onerror = () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      
      // timeslice=1000 ensures ondataavailable fires every second (cross-browser reliable)
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e: any) {
      console.error("Mic access error:", e);
      alert("Could not access microphone.\n\nPlease allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Flush remaining audio data before stopping
      if (mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.requestData(); } catch { /* some browsers don't support */ }
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !audioBlob) return;
    if (!profile || !db) return;
    setSending(true);
    
    try {
      const chatId = [profile.uid, counselorId].sort().join("_");
      const displayName = (profile.anonymousEnabled && profile.anonymousId 
        ? profile.anonymousId 
        : profile.fullName) || "User";

      // Upload audio to Firebase Storage if present
      let audioUrl: string | undefined;
      if (audioBlob) {
        audioUrl = await uploadVoiceMessage(audioBlob, chatId, profile.uid);
        if (!audioUrl) {
          console.error("Failed to upload voice message");
          alert("Failed to upload voice message. Please try again.");
          setSending(false);
          return;
        }
      }
      
      const tempId = Date.now().toString();
      
      // Add to local state immediately with audio
      const newMessage: Message = {
        id: tempId,
        text: inputText.trim() || "🎤 Voice message",
        senderId: profile.uid,
        senderName: displayName,
        createdAt: new Date(),
        audioUrl,
      };
      setMessages((prev) => [...prev, newMessage]);

      // Create/update conversation document with participants array
      await setDoc(doc(db, "directMessages", chatId), {
        participants: [profile.uid, counselorId],
        lastMessage: inputText.trim() || "🎤 Voice message",
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(db, "directMessages", chatId, "messages"), {
        text: inputText.trim() || "🎤 Voice message",
        senderId: profile.uid,
        senderName: displayName,
        createdAt: serverTimestamp(),
        audioUrl: audioUrl || null, // Store the actual URL in Firestore
      });
      
      setInputText("");
      setAudioBlob(null);
    } catch (e) {
      console.error(e);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const submitBookingRequest = async () => {
    if (!profile || !db || !selectedSlot) return;
    setBookingStatus("sending");

    try {
      const slot = availabilitySlots.find((s: any) => s.id === selectedSlot);
      if (!slot) return;

      // Create booking
      await addDoc(collection(db, "bookings"), {
        studentId: profile.uid,
        studentName: profile.anonymousEnabled && profile.anonymousId 
          ? profile.anonymousId 
          : profile.fullName,
        counselorId: counselorId,
        counselorName: counselor?.fullName,
        slotId: selectedSlot,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        message: bookingMessage,
        status: "confirmed", // Direct booking from availability
        createdAt: serverTimestamp(),
      });

      // Mark slot as booked
      const availabilityRef = doc(db, "counselorAvailability", counselorId);
      const availabilitySnap = await getDoc(availabilityRef);
      if (availabilitySnap.exists()) {
        const data = availabilitySnap.data();
        const updatedSlots = (data.slots || []).map((s: any) => 
          s.id === selectedSlot ? { ...s, isBooked: true } : s
        );
        await setDoc(availabilityRef, {
          slots: updatedSlots,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      setBookingStatus("sent");
    } catch (e) {
      console.error(e);
      setBookingStatus("idle");
    }
  };

  const formatSlotDate = (dateStr: string, startTime: string) => {
    const date = new Date(`${dateStr}T${startTime}`);
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!counselor) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <p>Counselor not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go back
          </Button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="flex h-full flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 shadow-sm md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {counselor.avatar ? (
              <img
                src={counselor.avatar}
                alt={counselor.fullName}
                className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-800"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-sm font-bold text-green-600">
                {counselor.fullName.split(" ").map((n) => n[0]).join("")}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{counselor.fullName}</h1>
                {counselor.isOnline && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </div>
                <p className="text-xs text-green-600 dark:text-green-400">{counselor.specialization}</p>
            </div>

            {/* Call buttons */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await initiateCall(counselorId, "voice");
                  } catch (error: any) {
                    console.error("Call failed:", error);
                    alert(`Failed to start call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 transition-all hover:bg-green-100 dark:hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Voice call"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await initiateCall(counselorId, "video");
                  } catch (error: any) {
                    console.error("Video call failed:", error);
                    alert(`Failed to start video call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Video call"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </button>
            </div>

          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("book")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "book"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Book Session
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "chat" ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-3xl space-y-3">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 text-center">
                    <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-400 dark:text-gray-500" />
                    <p className="text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Your messages are private and confidential.</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isOwn = msg.senderId === profile?.uid;

                  if (msg.type === "call") {
                    const isMissed = msg.callStatus === "missed";
                    const isRejected = msg.callStatus === "rejected";
                    const isVideo = msg.callType === "video";
                    const CallIcon = isMissed ? PhoneMissed
                      : isRejected ? PhoneOff
                      : msg.callStatus === "outgoing" ? PhoneOutgoing
                      : isVideo ? Video
                      : PhoneIncoming;
                    const label = isMissed ? "Missed" : isRejected ? "Declined" : msg.callStatus === "outgoing" ? "Outgoing" : msg.callStatus === "ended" ? "Ended" : "Incoming";
                    const tint = isMissed ? "bg-red-50 dark:bg-red-950 text-red-600" : isRejected ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" : isVideo ? "bg-blue-50 dark:bg-blue-950 text-blue-600" : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400";

                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${tint}`}>
                          <CallIcon className="h-3.5 w-3.5" />
                          <span>{isVideo ? "Video Call" : "Voice Call"}</span>
                          <span className="opacity-60">·</span>
                          <span className="opacity-70">{label}</span>
                          {msg.callStatus === "ended" && msg.callDuration != null && (
                            <><span className="opacity-60">·</span><span className="opacity-70">{formatCallDuration(msg.callDuration)}</span></>
                          )}
                          <span className="opacity-40">·</span>
                          <span className="opacity-50">{formatMessageTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      {!isOwn && (
                        <span className="mb-1 ml-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          {counselor?.fullName?.split(" ")[0] || msg.senderName}
                        </span>
                      )}
                      <div
                        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed
                          ${isOwn
                            ? "rounded-[18px_18px_4px_18px] bg-green-600 text-white"
                            : "rounded-[18px_18px_18px_4px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          }`}
                        style={{ wordBreak: "break-word" }}
                      >
                        {msg.audioUrl && (
                          <div className="mb-1.5">
                            <VoiceMessage audioUrl={msg.audioUrl} isOwnMessage={isOwn} />
                          </div>
                        )}
                        {msg.text && msg.text !== "🎤 Voice message" && (
                          <p className={msg.audioUrl ? "mt-1" : ""}>{msg.text}</p>
                        )}
                      </div>
                      <span className={`mt-1 text-[11px] text-gray-400 dark:text-gray-500 ${isOwn ? "mr-1" : "ml-1"}`}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
              style={{ padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto max-w-3xl">
                {audioBlob && (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-2.5">
                    <Mic className="h-4 w-4 text-green-600 shrink-0" />
                    <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
                    <button onClick={() => setAudioBlob(null)} className="shrink-0 p-1 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {isRecording ? (
                  <div className="flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    <span className="text-sm font-medium text-red-600">Recording {formatRecordingTime(recordingTime)}</span>
                    <div className="flex-1" />
                    <button onClick={() => { stopRecording(); setAudioBlob(null); }}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-red-100">Cancel</button>
                    <button onClick={stopRecording}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Stop</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <EmojiPicker onSelect={(emoji) => setInputText((t) => t + emoji)} />
                    <input
                      type="text"
                      placeholder="Message..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                      disabled={sending}
                      className="flex-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 focus:outline-none disabled:opacity-40"
                    />
                    {inputText.trim() || audioBlob ? (
                      <button
                        onClick={sendMessage}
                        disabled={sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition-all active:scale-95 disabled:opacity-40"
                      >
                        {sending ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all disabled:opacity-40"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Booking Tab */
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-2xl">
              {/* About */}
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">About</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{counselor.about}</p>
              </div>

              {/* Existing Request */}
              {existingRequest && (
                <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Request Pending</p>
                      <p className="mt-1 text-sm text-amber-700">
                        You already have a pending request. {counselor.fullName} will respond soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bookingStatus === "sent" ? (
                <div className="rounded-2xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 text-center">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Request Sent!</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    {counselor.fullName} will review your request and get back to you via chat.
                  </p>
                </div>
              ) : (
                <>
                  {/* Availability */}
                  <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Available Time Slots</h3>
                    </div>

                    {availabilitySlots.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {availabilitySlots.map((slot: any) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot.id)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                              selectedSlot === slot.id
                                ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                            }`}
                          >
                            <p className="font-medium">{formatSlotDate(slot.date, slot.startTime)}</p>
                            <p className="text-sm opacity-80">
                              {slot.startTime} - {slot.endTime}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950 p-4">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {counselor.fullName} hasn't added available times yet. 
                          You can still request a session — they'll reach out to coordinate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Add a message (optional)
                    </label>
                    <textarea
                      placeholder="Briefly describe what you'd like to discuss..."
                      value={bookingMessage}
                      onChange={(e) => setBookingMessage(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={submitBookingRequest}
                    disabled={!selectedSlot || bookingStatus === "sending" || !!existingRequest}
                    className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-6 text-base font-semibold"
                  >
                    {bookingStatus === "sending" ? "Booking..." : selectedSlot ? "Book This Slot" : "Select a Time Slot"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
