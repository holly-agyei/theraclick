"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Mic, X, MessageCircle, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
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

interface OtherUser {
  uid: string;
  fullName?: string;
  role?: string;
  avatar?: string;
  profilePicture?: string;
  specialization?: string;
  application?: { specialization?: string; about?: string };
}

interface StudentChatPanelProps {
  otherUserId: string;
  onBack?: () => void;
  embedded?: boolean;
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatMsgTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function StudentChatPanel({ otherUserId, onBack, embedded }: StudentChatPanelProps) {
  const { profile } = useAuth();
  const { initiateCall, isInCall } = useCall();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [otherLastRead, setOtherLastRead] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "users", otherUserId)).then((snap) => {
      if (snap.exists()) setOtherUser({ uid: snap.id, ...snap.data() } as OtherUser);
    }).catch(console.error);
  }, [otherUserId]);

  // Mark conversation as read + listen for the other user's lastRead timestamp
  useEffect(() => {
    if (!profile || !db) return;
    const chatId = [profile.uid, otherUserId].sort().join("_");
    const parentRef = doc(db, "directMessages", chatId);

    // Include participants so the doc can be created if it doesn't exist yet
    setDoc(parentRef, {
      participants: [profile.uid, otherUserId],
      [`unread_${profile.uid}`]: 0,
      [`lastRead_${profile.uid}`]: serverTimestamp(),
    }, { merge: true }).catch(() => {});

    const unsub = onSnapshot(parentRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const ts = data[`lastRead_${otherUserId}`];
      if (ts?.toDate) setOtherLastRead(ts.toDate());
    }, () => { /* doc may not exist yet — ignore permission error */ });
    return () => unsub();
  }, [profile, otherUserId]);

  useEffect(() => {
    if (!profile || !db) return;
    const chatId = [profile.uid, otherUserId].sort().join("_");
    const q = query(collection(db, "directMessages", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, createdAt: data.createdAt?.toDate() || new Date(), audioUrl: data.audioUrl || undefined } as Message;
      }));
    });
    return () => unsub();
  }, [profile, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep lastRead fresh while chat is open so incoming messages get marked as read in real-time
  const msgCount = messages.length;
  useEffect(() => {
    if (!profile || !db || msgCount === 0) return;
    const chatId = [profile.uid, otherUserId].sort().join("_");
    setDoc(doc(db, "directMessages", chatId), {
      [`unread_${profile.uid}`]: 0,
      [`lastRead_${profile.uid}`]: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  }, [msgCount, profile, otherUserId]);

  const messagesWithDates = useMemo(() => {
    const result: { type: "date"; label: string; key: string }[] | { type: "msg"; msg: Message; key: string }[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const dateStr = msg.createdAt.toDateString();
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        (result as { type: string; label?: string; msg?: Message; key: string }[]).push({ type: "date", label: getDateLabel(msg.createdAt), key: `date-${dateStr}` });
      }
      (result as { type: string; label?: string; msg?: Message; key: string }[]).push({ type: "msg", msg, key: msg.id });
    }
    return result as ({ type: "date"; label: string; key: string } | { type: "msg"; msg: Message; key: string })[];
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
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || mediaRecorder.mimeType || "audio/webm" });
        setAudioBlob(blob.size > 0 ? blob : null);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.onerror = () => { setIsRecording(false); stream.getTracks().forEach((t) => t.stop()); };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert("Could not access microphone.");
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !audioBlob) return;
    if (!profile || !db) return;
    setSending(true);
    try {
      const chatId = [profile.uid, otherUserId].sort().join("_");
      const displayName = (profile.anonymousEnabled && profile.anonymousId ? profile.anonymousId : profile.fullName) || "User";
      let audioUrl: string | undefined;
      if (audioBlob) {
        try { audioUrl = await uploadVoiceMessage(audioBlob, chatId, profile.uid); } catch { /* */ }
        if (!audioUrl) { alert("Failed to upload voice message."); setSending(false); return; }
      }
      const messageText = inputText.trim() || "🎤 Voice message";
      setMessages((prev) => [...prev, { id: Date.now().toString(), text: messageText, senderId: profile.uid, senderName: displayName, createdAt: new Date(), audioUrl }]);

      await setDoc(doc(db, "directMessages", chatId), {
        participants: [profile.uid, otherUserId],
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: profile.uid,
        updatedAt: serverTimestamp(),
        [`unread_${otherUserId}`]: increment(1),
      }, { merge: true });

      await addDoc(collection(db, "directMessages", chatId, "messages"), {
        text: messageText, senderId: profile.uid, senderName: displayName, createdAt: serverTimestamp(), audioUrl: audioUrl || null,
      });
      setInputText("");
      setAudioBlob(null);
    } catch (e: unknown) {
      alert(`Failed to send: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const displayName = otherUser?.fullName || "User";
  const avatar = otherUser?.avatar || otherUser?.profilePicture;
  const initials = displayName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const roleLabel = otherUser?.role === "counselor" ? "Counselor" : "Peer Mentor";
  const specialization = otherUser?.application?.specialization || otherUser?.specialization || "";

  const formatCallDuration = (s: number) => { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; };
  const formatRec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[12px] font-medium hidden sm:inline">Inbox</span>
            </button>
          )}
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F4F47] text-sm font-bold text-white">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-950 bg-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">{displayName}</h2>
            <p className="text-[11px] text-gray-400 truncate">
              {specialization ? `${roleLabel} · ${specialization}` : roleLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => initiateCall(otherUserId, "voice").catch(console.error)} disabled={isInCall}
              className="flex items-center gap-1.5 rounded-lg bg-[#0F4F47]/10 px-3 py-2 text-[#0F4F47] hover:bg-[#0F4F47]/20 disabled:opacity-50 transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-[11px] font-semibold hidden md:inline">Call</span>
            </button>
            <button onClick={() => initiateCall(otherUserId, "video").catch(console.error)} disabled={isInCall}
              className="flex items-center gap-1.5 rounded-lg bg-[#0F4F47]/10 px-3 py-2 text-[#0F4F47] hover:bg-[#0F4F47]/20 disabled:opacity-50 transition-colors">
              <Video className="h-4 w-4" />
              <span className="text-[11px] font-semibold hidden md:inline">Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-1.5 min-h-full flex flex-col justify-end">
          {messages.length === 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center">
              <MessageCircle className="mx-auto mb-2 h-7 w-7 text-gray-300" />
              <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
            </div>
          )}
          {messagesWithDates.map((item) => {
            if (item.type === "date") {
              return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
              );
            }
            const msg = item.msg;
            const isOwn = msg.senderId === profile?.uid;
            if (msg.type === "call") {
              const isMissed = msg.callStatus === "missed";
              const isRejected = msg.callStatus === "rejected";
              const isVideo = msg.callType === "video";
              const CallIcon = isMissed ? PhoneMissed : isRejected ? PhoneOff : msg.callStatus === "outgoing" ? PhoneOutgoing : isVideo ? Video : PhoneIncoming;
              const label = isMissed ? "Missed" : isRejected ? "Declined" : msg.callStatus === "outgoing" ? "Outgoing" : msg.callStatus === "ended" ? "Ended" : "Incoming";
              const tint = isMissed ? "bg-red-50 dark:bg-red-900/50 text-red-600" : isRejected ? "bg-gray-100 dark:bg-gray-800 text-gray-500" : "bg-[#0F4F47]/10 text-[#0F4F47]";
              return (
                <div key={item.key} className="flex justify-center my-2">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium ${tint}`}>
                    <CallIcon className="h-3 w-3" /> {isVideo ? "Video" : "Voice"} · {label}
                    {msg.callStatus === "ended" && msg.callDuration != null && <> · {formatCallDuration(msg.callDuration)}</>}
                    <span className="opacity-50">{formatMsgTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={item.key} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && <span className="mb-0.5 ml-1 text-[10px] font-medium text-gray-400">{displayName}</span>}
                <div className={`max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed ${isOwn ? "rounded-[16px_16px_4px_16px] bg-[#0F4F47] text-white" : "rounded-[16px_16px_16px_4px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`}
                  style={{ wordBreak: "break-word" }}>
                  {msg.audioUrl && <div className="max-w-[220px]"><VoiceMessage audioUrl={msg.audioUrl} isOwnMessage={isOwn} /></div>}
                  {msg.text && msg.text !== "🎤 Voice message" && <p className={msg.audioUrl ? "mt-1" : ""}>{msg.text}</p>}
                </div>
                <span className={`mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 ${isOwn ? "mr-1 justify-end" : "ml-1"}`}>
                  {formatMsgTime(msg.createdAt)}
                  {isOwn && (
                    otherLastRead && msg.createdAt <= otherLastRead
                      ? <CheckCheck className="h-3.5 w-3.5 text-[#2BB5A0]" />
                      : <Check className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2.5"
        style={{ paddingBottom: embedded ? "10px" : "max(10px, env(safe-area-inset-bottom))" }}>
        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#0F4F47]/20 bg-[#0F4F47]/5 px-3 py-2">
            <Mic className="h-4 w-4 text-[#0F4F47] shrink-0" />
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
            <button onClick={() => setAudioBlob(null)} className="shrink-0 p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        {isRecording ? (
          <div className="flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
            <span className="text-xs font-medium text-red-600">{formatRec(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={() => { stopRecording(); setAudioBlob(null); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={stopRecording} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white">Stop</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <EmojiPicker onSelect={(emoji) => setInputText((t) => t + emoji)} />
            <input type="text" placeholder="Type a message..." value={inputText} onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()} disabled={sending}
              className="flex-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none disabled:opacity-40" />
            {inputText.trim() || audioBlob ? (
              <button onClick={sendMessage} disabled={sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F4F47] text-white active:scale-95 disabled:opacity-40 transition-transform">
                {sending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4.5 w-4.5" />}
              </button>
            ) : (
              <button onClick={startRecording} disabled={sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-[#0F4F47]/10 hover:text-[#0F4F47] disabled:opacity-40 transition-colors">
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
