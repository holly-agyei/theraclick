"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Mic, MicOff, X, User, GraduationCap, MessageCircle, Phone, Video } from "lucide-react";
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
  email?: string;
}

export default function CounselorChatPage() {
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
      
      // Pick first supported mime
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
    } catch (e: any) {
      console.error("Mic access error:", e);
      alert(`Could not access microphone.\n\nPlease allow microphone access and try again.`);
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
    console.log("=== SEND MESSAGE ===");
    console.log("Has text:", !!inputText.trim());
    console.log("Has audio:", !!audioBlob, audioBlob?.size);
    
    if (!inputText.trim() && !audioBlob) {
      console.log("Nothing to send");
      return;
    }
    if (!profile || !db) {
      console.log("No profile or db");
      return;
    }
    
    setSending(true);
    
    try {
      const chatId = [profile.uid, studentId].sort().join("_");
      const displayName = profile.fullName || "Counselor";
      
      // Upload audio to Firebase Storage if present
      let audioUrl: string | undefined;
      if (audioBlob) {
        console.log("Uploading audio blob...", audioBlob.size, "bytes");
        try {
          audioUrl = await uploadVoiceMessage(audioBlob, chatId, profile.uid);
          console.log("Upload result:", audioUrl ? "success" : "failed");
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
        }
        
        if (!audioUrl) {
          console.error("Failed to get audio URL");
          alert("Failed to upload voice message. Please try again.");
          setSending(false);
          return;
        }
      }
      
      const tempId = Date.now().toString();
      const messageText = inputText.trim() || "🎤 Voice message";
      
      const newMessage: Message = {
        id: tempId,
        text: messageText,
        senderId: profile.uid,
        senderName: displayName,
        createdAt: new Date(),
        audioUrl,
      };
      setMessages((prev) => [...prev, newMessage]);

      console.log("Saving to Firestore...");
      
      // Create conversation document if it doesn't exist
      await setDoc(doc(db, "directMessages", chatId), {
        participants: [profile.uid, studentId],
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: profile.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(db, "directMessages", chatId, "messages"), {
        text: messageText,
        senderId: profile.uid,
        senderName: displayName,
        createdAt: serverTimestamp(),
        audioUrl: audioUrl || null,
      });
      
      console.log("✓ Message sent successfully");
      setInputText("");
      setAudioBlob(null);
    } catch (e: any) {
      console.error("Send message error:", e);
      alert(`Failed to send message: ${e?.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const studentDisplayName = student?.anonymousEnabled && student?.anonymousId 
    ? student.anonymousId 
    : student?.fullName || "Student";

  return (
    <LayoutWrapper>
      <div className="flex h-screen flex-col bg-[#F0FDF4]">
        {/* Header */}
        <div className="relative z-10 border-b border-gray-200 bg-white px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              {studentDisplayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{studentDisplayName}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {student?.school && (
                  <>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{student.school}</span>
                    </div>
                    <span>•</span>
                  </>
                )}
                {student?.educationLevel && <span>{student.educationLevel}</span>}
                {student?.anonymousEnabled && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Anonymous Mode</span>
                  </>
                )}
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
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
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
                      ? "bg-green-600 text-white"
                      : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {msg.audioUrl ? (
                    <VoiceMessage 
                      audioUrl={msg.audioUrl} 
                      isOwnMessage={msg.senderId === profile?.uid}
                    />
                  ) : null}
                  {msg.text && msg.text !== "🎤 Voice message" && (
                    <p className={`text-sm ${msg.audioUrl ? "mt-2" : ""}`}>{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4 md:p-6">
          <div className="mx-auto max-w-3xl">
            {audioBlob && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-blue-100 border border-blue-200 px-4 py-3">
                <Mic className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" style={{ maxWidth: '100%' }} />
                </div>
                <button 
                  onClick={() => setAudioBlob(null)} 
                  className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
                  isRecording ? "bg-red-100 text-red-600" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-colors focus:border-green-500 focus:outline-none disabled:opacity-50"
              />
              <Button
                onClick={sendMessage}
                disabled={(!inputText.trim() && !audioBlob) || sending}
                className="rounded-xl bg-green-600 px-5 min-w-[60px] hover:bg-green-700"
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
