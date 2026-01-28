"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Mic, MicOff, X, User, MessageCircle, Phone, Video } from "lucide-react";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { useCall } from "@/context/callContext";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  audioUrl?: string;
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
  const audioUrlMapRef = useRef<Map<string, string>>(new Map());

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
        const msgId = d.id;
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
  }, [profile, studentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
        else mimeType = "";
      }
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Could not access microphone.\n\nPlease:\n1. Click the lock icon in your browser's address bar\n2. Allow microphone access\n3. Refresh the page and try again");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
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

  return (
    <LayoutWrapper>
      <div className="flex h-screen flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <div className="relative z-10 border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
              {studentDisplayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-white truncate">{studentDisplayName}</h1>
              <div className="flex items-center gap-2 text-sm">
                {student?.school && (
                  <>
                    <span className="text-gray-500">{student.school}</span>
                    <span className="text-gray-600">•</span>
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
                className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm font-medium text-green-400 transition-all hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                <p className="text-gray-400">No messages yet. Start the conversation!</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === profile?.uid ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.senderId === profile?.uid
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                      : "border border-white/10 bg-white/5 text-gray-100"
                  }`}
                >
                  {msg.audioUrl ? (
                    <div className="mb-2">
                      <VoiceMessage 
                        audioUrl={msg.audioUrl} 
                        isOwnMessage={msg.senderId === profile?.uid}
                      />
                    </div>
                  ) : null}
                  {msg.text && <p className={`text-sm ${msg.audioUrl ? "mt-2" : ""}`}>{msg.text}</p>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-black/20 p-4 backdrop-blur-xl md:p-6">
          <div className="mx-auto max-w-3xl">
            {audioBlob && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <Mic className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
                </div>
                <button 
                  onClick={() => setAudioBlob(null)} 
                  className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 transition-all ${
                  isRecording ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                } ${sending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isRecording ? (
                  <><MicOff className="h-5 w-5" /><span className="text-sm">{formatRecordingTime(recordingTime)}</span></>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
              <input
                type="text"
                placeholder="Type or record a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                disabled={sending}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
              />
              <Button
                onClick={sendMessage}
                disabled={(!inputText.trim() && !audioBlob) || sending}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 min-w-[60px]"
              >
                {sending ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
