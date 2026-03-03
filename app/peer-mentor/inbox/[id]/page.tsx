"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Mic, MicOff, X, User, MessageCircle, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff } from "lucide-react";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { useCall } from "@/context/callContext";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

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

interface Student {
  uid: string;
  fullName?: string;
  anonymousId?: string;
  anonymousEnabled?: boolean;
  school?: string;
  educationLevel?: string;
}

export default function PeerMentorChatPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { initiateCall, isInCall } = useCall();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // audioUrlMapRef removed — audioUrl is read directly from Firestore data

  // Load student info
  useEffect(() => {
    async function loadStudent() {
      if (!db) return;
      try {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        if (studentDoc.exists()) {
          setStudent({ uid: studentDoc.id, ...studentDoc.data() } as Student);
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadStudent();
  }, [studentId]);

  // Load messages
  useEffect(() => {
    if (!profile || !db) return;
    
    const chatId = [profile.uid, studentId].sort().join("_");
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
  }, [profile, studentId]);

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
      const chatId = [profile.uid, studentId].sort().join("_");
      const displayName = profile.fullName || "Peer Mentor";
      
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
      
      const newMessage: Message = {
        id: tempId,
        text: inputText.trim() || "🎤 Voice message",
        senderId: profile.uid,
        senderName: displayName,
        createdAt: new Date(),
        audioUrl,
      };
      setMessages((prev) => [...prev, newMessage]);

      // Create/update conversation document
      await setDoc(doc(db, "directMessages", chatId), {
        participants: [profile.uid, studentId],
        lastMessage: inputText.trim() || "🎤 Voice message",
        lastMessageTime: serverTimestamp(),
        lastMessageSender: profile.uid,
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

  const studentDisplayName = student?.anonymousEnabled && student?.anonymousId 
    ? student.anonymousId 
    : student?.fullName || "Student";

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

  return (
    <LayoutWrapper>
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <div className="relative z-10 border-b border-gray-200 bg-white px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">
              {studentDisplayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{studentDisplayName}</h1>
              <div className="flex items-center gap-2 text-sm">
                {student?.school && (
                  <>
                    <span className="text-gray-500">{student.school}</span>
                    <span className="text-gray-400">•</span>
                  </>
                )}
                <span className="text-gray-500">Student</span>
              </div>
            </div>

            {/* Call buttons */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await initiateCall(studentId, "voice");
                  } catch (error: any) {
                    console.error("Call failed:", error);
                    alert(`Failed to start call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-600 transition-all hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Voice call"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await initiateCall(studentId, "video");
                  } catch (error: any) {
                    console.error("Video call failed:", error);
                    alert(`Failed to start video call: ${error?.message || "Unknown error"}`);
                  }
                }}
                disabled={isInCall}
                className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
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
                      {studentDisplayName}
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
            {isRecording ? (
              <div className="flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-600">Recording {formatRecordingTime(recordingTime)}</span>
                <div className="flex-1" />
                <button onClick={() => { stopRecording(); setAudioBlob(null); }}
                  className="rounded-lg px-3 py-1 text-xs font-medium text-gray-500 hover:bg-red-100">Cancel</button>
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
                  className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none disabled:opacity-40"
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all disabled:opacity-40"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
