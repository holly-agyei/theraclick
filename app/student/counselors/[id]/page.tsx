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
} from "lucide-react";
import { doc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { useCall } from "@/context/callContext";
import { Phone, Video } from "lucide-react";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";

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
  const audioUrlMapRef = useRef<Map<string, string>>(new Map()); // Store audio URLs by message ID

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
        const msgId = d.id;
        // Preserve audio URL if we have it stored locally
        const audioUrl = audioUrlMapRef.current.get(msgId);
        return {
          id: msgId,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          audioUrl: audioUrl || undefined,
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

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!counselor) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
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
      <div className="flex h-screen flex-col bg-[#0D1F1D]">
        {/* Header */}
        <div className="relative z-10 border-b border-white/[0.06] bg-[#0D1F1D]/90 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {counselor.avatar ? (
              <img
                src={counselor.avatar}
                alt={counselor.fullName}
                className="h-10 w-10 rounded-full object-cover border-2 border-white/[0.12]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2BB5A0]/20 text-sm font-bold text-[#2BB5A0]">
                {counselor.fullName.split(" ").map((n) => n[0]).join("")}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white truncate">{counselor.fullName}</h1>
                {counselor.isOnline && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#2BB5A0]">{counselor.specialization}</p>
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
                className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm font-medium text-green-400 transition-all hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("book")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "book"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
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
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                    <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                    <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Your messages are private and confidential.
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isOwn = msg.senderId === profile?.uid;
                  // Show timestamp if gap > 5 min from previous message
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showTimestamp = !prevMsg ||
                    (msg.createdAt.getTime() - prevMsg.createdAt.getTime() > 5 * 60 * 1000);

                  return (
                    <div key={msg.id}>
                      {showTimestamp && (
                        <div className="my-3 text-center">
                          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] text-[#6B8C89] uppercase">
                            {msg.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] px-3.5 py-2.5 text-[15px] leading-relaxed
                            ${isOwn
                              ? "rounded-[18px_18px_4px_18px] bg-[#2BB5A0] text-white"
                              : "rounded-[18px_18px_18px_4px] bg-white/[0.08] text-white/90"
                            }`}
                          style={{ wordBreak: "break-word" }}
                        >
                          {msg.audioUrl && (
                            <div className="mb-1.5">
                              <VoiceMessage
                                audioUrl={msg.audioUrl}
                                isOwnMessage={isOwn}
                              />
                            </div>
                          )}
                          {msg.text && msg.text !== "🎤 Voice message" && (
                            <p className={`text-sm ${msg.audioUrl ? "mt-1.5" : ""}`}>{msg.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar — sticky, mobile-safe */}
            <div className="border-t border-white/[0.06] bg-[#0D1F1D]/90 backdrop-blur-xl"
              style={{ padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto max-w-3xl">
                {/* Audio preview */}
                {audioBlob && (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 px-4 py-2.5">
                    <Mic className="h-4 w-4 text-[#2BB5A0] shrink-0" />
                    <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
                    <button onClick={() => setAudioBlob(null)}
                      className="shrink-0 p-1 rounded-full text-[#6B8C89] hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* Mic button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sending}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all
                      ${isRecording
                        ? "bg-red-500/20 text-red-400"
                        : "text-[#6B8C89] hover:bg-white/10 hover:text-white"
                      } ${sending ? "opacity-40" : ""}`}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>

                  {isRecording && (
                    <span className="shrink-0 text-xs text-red-400 font-medium">{formatRecordingTime(recordingTime)}</span>
                  )}

                  {/* Text input */}
                  <input
                    type="text"
                    placeholder="Message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                    disabled={sending}
                    className="flex-1 rounded-[20px] border border-white/[0.10] bg-white/[0.05] px-4 py-2.5
                      text-[15px] text-white placeholder-white/30 transition-colors
                      focus:border-[#2BB5A0]/50 focus:outline-none disabled:opacity-40"
                  />

                  {/* Send button — only when there's content */}
                  {(inputText.trim() || audioBlob) ? (
                    <button
                      onClick={sendMessage}
                      disabled={sending}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                        bg-[#2BB5A0] text-white transition-all active:scale-[0.88]
                        disabled:opacity-40"
                    >
                      {sending ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Booking Tab */
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-2xl">
              {/* About */}
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-2 font-medium text-white">About</h3>
                <p className="text-sm leading-relaxed text-gray-400">{counselor.about}</p>
              </div>

              {/* Existing Request */}
              {existingRequest && (
                <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-200">Request Pending</p>
                      <p className="mt-1 text-sm text-amber-200/70">
                        You already have a pending request. {counselor.fullName} will respond soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bookingStatus === "sent" ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
                  <h3 className="text-xl font-semibold text-white">Request Sent!</h3>
                  <p className="mt-2 text-gray-400">
                    {counselor.fullName} will review your request and get back to you via chat.
                  </p>
                </div>
              ) : (
                <>
                  {/* Availability */}
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-400" />
                      <h3 className="font-medium text-white">Available Time Slots</h3>
                    </div>

                    {availabilitySlots.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {availabilitySlots.map((slot: any) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot.id)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                              selectedSlot === slot.id
                                ? "border-purple-500 bg-purple-500/20 text-purple-300"
                                : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
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
                      <div className="rounded-xl bg-amber-500/10 p-4">
                        <p className="text-sm text-amber-300">
                          {counselor.fullName} hasn't added available times yet. 
                          You can still request a session — they'll reach out to coordinate.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                      Add a message (optional)
                    </label>
                    <textarea
                      placeholder="Briefly describe what you'd like to discuss..."
                      value={bookingMessage}
                      onChange={(e) => setBookingMessage(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={submitBookingRequest}
                    disabled={!selectedSlot || bookingStatus === "sending" || !!existingRequest}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-6 text-base font-semibold"
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

// Helper for useEffect
import { getDocs } from "firebase/firestore";
