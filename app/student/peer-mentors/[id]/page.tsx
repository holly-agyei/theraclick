"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Send,
  GraduationCap,
  MessageCircle,
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
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { useCall } from "@/context/callContext";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";

interface PeerMentor {
  uid: string;
  fullName: string;
  specialization?: string;
  about?: string;
  school?: string;
  conversationsCount?: number;
  isOnline?: boolean;
  avatar?: string;
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

// Demo data
const demoPeerMentors: Record<string, PeerMentor> = {
  "mentor-1": {
    uid: "mentor-1",
    fullName: "Esi Owusu",
    specialization: "Academic Stress",
    about: "3rd year Psychology student. Been through the struggle and here to help! I understand how overwhelming it can feel when assignments pile up and exams are around the corner. Let's talk through it together.",
    school: "University of Ghana",
    conversationsCount: 89,
    isOnline: true,
  },
  "mentor-2": {
    uid: "mentor-2",
    fullName: "Yaw Mensah",
    specialization: "First Year Transition",
    about: "Final year Engineering student. I know how overwhelming first year can be - new environment, new people, new expectations. I've been there and I'm here to help you navigate it.",
    school: "KNUST",
    conversationsCount: 156,
    isOnline: true,
  },
  "mentor-3": {
    uid: "mentor-3",
    fullName: "Adwoa Asare",
    specialization: "Anxiety & Overthinking",
    about: "Medical student who's learned to manage anxiety. Happy to share what works! Sometimes it helps to talk to someone who truly gets it.",
    school: "UCC",
    conversationsCount: 203,
    isOnline: false,
  },
  "mentor-4": {
    uid: "mentor-4",
    fullName: "Kofi Darko",
    specialization: "Relationships & Social Life",
    about: "Sometimes you just need someone your age to talk to. No judgment, just a listening ear and maybe some advice from someone who's been through similar situations.",
    school: "Ashesi University",
    conversationsCount: 67,
    isOnline: true,
  },
  "mentor-5": {
    uid: "mentor-5",
    fullName: "Akua Boateng",
    specialization: "Study Tips & Motivation",
    about: "Dean's list student sharing practical study strategies that actually work. I believe everyone has the potential to excel - sometimes you just need the right approach.",
    school: "University of Ghana",
    conversationsCount: 142,
    isOnline: false,
  },
};

export default function PeerMentorChatPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { initiateCall, isInCall } = useCall();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<PeerMentor | null>(null);
  const [loading, setLoading] = useState(true);
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
  // audioUrlMapRef removed — audioUrl is read directly from Firestore data

  // Load mentor
  useEffect(() => {
    async function loadMentor() {
      try {
        if (db && !mentorId.startsWith("mentor-")) {
          const docSnap = await getDoc(doc(db, "users", mentorId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMentor({ 
              uid: docSnap.id,
              fullName: data.fullName,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              school: data.student?.school || data.school,
              conversationsCount: data.conversationsCount || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as PeerMentor);
          }
        } else {
          setMentor(demoPeerMentors[mentorId] || null);
        }
      } catch (e) {
        console.error(e);
        setMentor(demoPeerMentors[mentorId] || null);
      } finally {
        setLoading(false);
      }
    }
    void loadMentor();
  }, [mentorId]);

  // Load chat messages (real-time)
  useEffect(() => {
    if (!profile || !db) return;
    
    const chatId = [profile.uid, mentorId].sort().join("_");
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
  }, [profile, mentorId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      
      mediaRecorder.start(1000); // 1s timeslice for cross-browser reliability
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Could not access microphone.\n\nPlease allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.requestData(); } catch { /* ok */ }
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
      const chatId = [profile.uid, mentorId].sort().join("_");
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
        participants: [profile.uid, mentorId],
        lastMessage: inputText.trim() || "🎤 Voice message",
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(db, "directMessages", chatId, "messages"), {
        text: inputText.trim() || "🎤 Voice message",
        senderId: profile.uid,
        senderName: displayName,
        createdAt: serverTimestamp(),
        audioUrl: audioUrl || null,
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
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!mentor) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white text-gray-900">
          <p>Peer mentor not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go back
          </Button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <div className="relative z-10 border-b border-gray-200 bg-white px-4 py-4 shadow-sm md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {mentor.avatar ? (
              <img
                src={mentor.avatar}
                alt={mentor.fullName}
                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-600">
                {mentor.fullName.split(" ").map((n) => n[0]).join("")}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 truncate">{mentor.fullName}</h1>
                {mentor.isOnline && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">{mentor.specialization}</span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <GraduationCap className="h-3 w-3" />
                  {mentor.school}
                </span>
              </div>
            </div>

            {/* Call buttons */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await initiateCall(mentorId, "voice");
                  } catch (error: any) {
                    console.error("Call failed:", error);
                    alert(`Failed to start call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600 transition-all hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Voice call"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await initiateCall(mentorId, "video");
                  } catch (error: any) {
                    console.error("Video call failed:", error);
                    alert(`Failed to start video call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Video call"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </button>
            </div>

          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="text-gray-500">Start the conversation!</p>
                <p className="mt-1 text-xs text-gray-400">
                  {mentor.fullName.split(" ")[0]} is here to listen and support you.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.senderId === profile?.uid;

              if (msg.type === "call") {
                const isMissed = msg.callStatus === "missed";
                const isRejected = msg.callStatus === "rejected";
                const isVideo = msg.callType === "video";
                const CallIcon = isMissed ? PhoneMissed : isRejected ? PhoneOff : msg.callStatus === "outgoing" ? PhoneOutgoing : isVideo ? Video : PhoneIncoming;
                const label = isMissed ? "Missed" : isRejected ? "Declined" : msg.callStatus === "outgoing" ? "Outgoing" : msg.callStatus === "ended" ? "Ended" : "Incoming";
                const tint = isMissed ? "bg-red-50 text-red-600" : isRejected ? "bg-gray-100 text-gray-500" : isVideo ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600";

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
                    <span className="mb-1 ml-1 text-[11px] font-medium text-gray-400">
                      {mentor?.fullName?.split(" ")[0] || msg.senderName}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed
                      ${isOwn
                        ? "rounded-[18px_18px_4px_18px] bg-green-600 text-white"
                        : "rounded-[18px_18px_18px_4px] bg-gray-100 text-gray-800"
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
                  <span className={`mt-1 text-[11px] text-gray-400 ${isOwn ? "mr-1" : "ml-1"}`}>
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white"
          style={{ padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto max-w-3xl">
            {audioBlob && (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
                <Mic className="h-4 w-4 text-green-600 shrink-0" />
                <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
                <button onClick={() => setAudioBlob(null)} className="shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all
                  ${isRecording ? "bg-red-50 text-red-500" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}
                  ${sending ? "opacity-40" : ""}`}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              {isRecording && (
                <span className="shrink-0 text-xs text-red-500 font-medium">{formatRecordingTime(recordingTime)}</span>
              )}
              <input
                type="text"
                placeholder="Message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                disabled={sending}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none disabled:opacity-40"
              />
              {(inputText.trim() || audioBlob) && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
