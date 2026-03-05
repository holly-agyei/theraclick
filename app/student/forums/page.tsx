"use client";

/**
 * FORUMS — Community conversations.
 * Auto-selects the first forum on desktop. No dead empty states.
 * Forum icons are Lucide SVGs, not emojis.
 */

import { useState, useEffect, useRef } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Hash,
  Search,
  Send,
  Smile,
  Image as ImageIcon,
  Trash2,
  Users,
  MessageSquare,
  ChevronRight,
  X,
  Reply,
  Mic,
  MicOff,
  ChevronDown,
  BookOpen,
  Heart,
  GraduationCap,
  Shield,
  Sparkles,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { VoiceMessage } from "@/components/VoiceMessage";
import { uploadVoiceMessage } from "@/lib/audioUpload";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Forum {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  memberCount: number;
  lastPost?: string;
}

interface ForumMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  reactions: Record<string, string[]>;
  imageUrl?: string;
  audioUrl?: string;
  isAnonymous: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  threadCount?: number;
}

const reactionEmojis = ["❤️", "👍", "🙏", "💪", "🤗"];

// Forums with SVG icons instead of emojis
const demoForums: Forum[] = [
  { id: "general", name: "General", description: "A place for everyone to connect", icon: MessageSquare, memberCount: 342, lastPost: "Welcome! We're all here to support each other." },
  { id: "exam-stress", name: "Exam Stress", description: "Support through exam season", icon: BookOpen, memberCount: 189, lastPost: "Finals week is here. How is everyone coping?" },
  { id: "anxiety-support", name: "Anxiety Support", description: "A safe space to share", icon: Leaf, memberCount: 156, lastPost: "Breathing exercises that actually help." },
  { id: "relationships", name: "Relationships", description: "Navigate friendships and family", icon: Heart, memberCount: 98, lastPost: "How do you set boundaries with people you love?" },
  { id: "first-year", name: "First Year Life", description: "For freshers navigating uni", icon: GraduationCap, memberCount: 234, lastPost: "Anyone else feeling lost in their first semester?" },
  { id: "self-care", name: "Self Care Corner", description: "Tips for taking care of yourself", icon: Shield, memberCount: 178, lastPost: "Small daily habits that changed my wellbeing." },
];

export default function ForumsPage() {
  const { profile } = useAuth();
  const [forums] = useState<Forum[]>(demoForums);
  // Auto-select first forum instead of null
  const [selectedForum, setSelectedForum] = useState<Forum | null>(demoForums[0]);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileForums, setShowMobileForums] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Demo messages
  const [demoMessages] = useState<Record<string, ForumMessage[]>>({
    general: [
      { id: "1", text: "Hey everyone! Just joined TheraClick. Feeling a bit overwhelmed but hoping to find some support here.", senderId: "user1", senderName: "Anonymous Owl", createdAt: new Date(Date.now() - 3600000 * 2), reactions: { "❤️": ["user2", "user3"], "🤗": ["user4"] }, isAnonymous: true, threadCount: 2 },
      { id: "2", text: "Welcome! You're in the right place. We're all here to support each other. What's been on your mind?", senderId: "user2", senderName: "Peaceful Bear", createdAt: new Date(Date.now() - 3600000 * 1.5), reactions: { "👍": ["user1"] }, isAnonymous: true },
      { id: "3", text: "Same here! Just started my second year and the pressure is real. But talking about it helps.", senderId: "user3", senderName: "Brave Lion", createdAt: new Date(Date.now() - 3600000), reactions: { "💪": ["user1", "user2"] }, isAnonymous: true },
    ],
    "exam-stress": [
      { id: "1", text: "Finals week is really getting to me. Anyone else feeling completely unprepared?", senderId: "user5", senderName: "Tired Phoenix", createdAt: new Date(Date.now() - 7200000), reactions: { "🤗": ["user9"] }, isAnonymous: true, threadCount: 5 },
      { id: "2", text: "You got this! Remember: one exam at a time. What subject is stressing you most?", senderId: "user6", senderName: "Calm Eagle", createdAt: new Date(Date.now() - 3600000), reactions: { "❤️": ["user5"] }, isAnonymous: true },
    ],
  });

  // Load messages
  useEffect(() => {
    if (!selectedForum) {
      setMessages([]);
      return;
    }
    
    if (db) {
      const q = query(collection(db, "forums", selectedForum.id, "messages"), orderBy("createdAt", "asc"));
      const unsub = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setMessages(demoMessages[selectedForum.id] || []);
        } else {
          setMessages(snap.docs.map((d) => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: d.data().createdAt?.toDate() || new Date(), 
            reactions: d.data().reactions || {},
            isAnonymous: d.data().isAnonymous || false,
          })) as ForumMessage[]);
        }
      }, () => {
        setMessages(demoMessages[selectedForum.id] || []);
      });
      return () => unsub();
    } else {
      setMessages(demoMessages[selectedForum.id] || []);
    }
  }, [selectedForum]);

  // Load thread replies
  useEffect(() => {
    if (!selectedThread || !selectedForum || !db) {
      setThreadReplies([]);
      return;
    }
    const q = query(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setThreadReplies(snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(), 
        createdAt: d.data().createdAt?.toDate() || new Date(), 
        reactions: d.data().reactions || {},
        isAnonymous: d.data().isAnonymous || false,
      })) as ForumMessage[]);
    }, () => setThreadReplies([]));
    return () => unsub();
  }, [selectedThread, selectedForum]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadReplies]);

  const sendMessage = async (isThreadReply = false) => {
    if (!inputText.trim() && !audioBlob && !selectedImage) return;
    if (!selectedForum || !profile) return;

    setSending(true);

    try {
      const displayName = (profile.anonymousEnabled && profile.anonymousId 
        ? profile.anonymousId 
        : profile.fullName) || "Anonymous";

      let audioUrl: string | undefined;
      if (audioBlob) {
        try {
          audioUrl = await uploadVoiceMessage(audioBlob, `forum_${selectedForum.id}`, profile.uid);
          if (!audioUrl) {
            alert("Failed to upload voice message. Please try again.");
            return;
          }
        } catch (e) {
          console.error("Voice upload error:", e);
          alert("Failed to upload voice message. Please try again.");
          return;
        }
      }

      const newMessage: Partial<ForumMessage> = {
        text: inputText.trim() || (audioUrl ? "🎤 Voice message" : ""),
        senderId: profile.uid,
        senderName: displayName,
        createdAt: new Date(),
        reactions: {},
        isAnonymous: profile.anonymousEnabled || false,
        imageUrl: selectedImage || undefined,
        audioUrl,
      };

      if (replyingTo && !isThreadReply) {
        newMessage.replyTo = { id: replyingTo.id, text: replyingTo.text.slice(0, 50), senderName: replyingTo.senderName };
      }

      setInputText("");
      setReplyingTo(null);
      setSelectedImage(null);
      setAudioBlob(null);

      if (db && profile?.uid) {
        const messageData = {
          text: newMessage.text || "",
          senderId: profile.uid,
          senderName: newMessage.senderName || "Anonymous",
          createdAt: serverTimestamp(),
          reactions: {},
          isAnonymous: newMessage.isAnonymous || false,
          ...(newMessage.imageUrl && { imageUrl: newMessage.imageUrl }),
          ...(newMessage.audioUrl && { audioUrl: newMessage.audioUrl }),
          ...(newMessage.replyTo && { replyTo: newMessage.replyTo }),
        };

        if (isThreadReply && selectedThread) {
          await addDoc(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), messageData);
          await updateDoc(doc(db, "forums", selectedForum.id, "messages", selectedThread.id), { 
            threadCount: (selectedThread.threadCount || 0) + 1 
          });
        } else {
          await addDoc(collection(db, "forums", selectedForum.id, "messages"), messageData);
        }
      } else {
        if (isThreadReply) {
          setThreadReplies((prev) => [...prev, { id: Date.now().toString(), ...newMessage, createdAt: new Date() } as ForumMessage]);
        } else {
          setMessages((prev) => [...prev, { id: Date.now().toString(), ...newMessage, createdAt: new Date() } as ForumMessage]);
        }
      }
    } catch (e) {
      console.error("Error sending forum message:", e);
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string, isThread = false) => {
    if (!profile || !selectedForum || !profile.uid) return;
    const updateFn = isThread ? setThreadReplies : setMessages;
    updateFn((prev) => prev.map((msg) => {
      if (msg.id !== messageId) return msg;
      const reactions = { ...msg.reactions };
      const users = reactions[emoji] || [];
      reactions[emoji] = users.includes(profile.uid) ? users.filter((u) => u !== profile.uid) : [...users, profile.uid];
      if (reactions[emoji].length === 0) delete reactions[emoji];
      return { ...msg, reactions };
    }));
    setShowEmojiPicker(null);

    if (db) {
      const basePath = isThread && selectedThread 
        ? `forums/${selectedForum.id}/messages/${selectedThread.id}/replies`
        : `forums/${selectedForum.id}/messages`;
      const msgRef = doc(db, basePath, messageId);
      const msgs = isThread ? threadReplies : messages;
      const msg = msgs.find((m) => m.id === messageId);
      if (msg && profile.uid) {
        try {
          await updateDoc(msgRef, { [`reactions.${emoji}`]: msg.reactions[emoji]?.includes(profile.uid) ? arrayRemove(profile.uid) : arrayUnion(profile.uid) });
        } catch (e) { console.error(e); }
      }
    }
  };

  const deleteMessage = async (messageId: string, isThread = false) => {
    if (!selectedForum) return;
    const updateFn = isThread ? setThreadReplies : setMessages;
    updateFn((prev) => prev.filter((m) => m.id !== messageId));
    if (db) {
      const path = isThread && selectedThread 
        ? `forums/${selectedForum.id}/messages/${selectedThread.id}/replies/${messageId}`
        : `forums/${selectedForum.id}/messages/${messageId}`;
      try { await deleteDoc(doc(db, path)); } catch (e) { console.error(e); }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Your browser does not support audio recording. Try Chrome or Firefox.");
      return;
    }
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

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const filteredForums = forums.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const MessageComponent = ({ msg, isThread = false }: { msg: ForumMessage; isThread?: boolean }) => (
    <div className="group">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
          bg-green-100 dark:bg-green-900 text-xs font-bold text-green-600">
          {msg.senderName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{msg.senderName}</span>
            {msg.isAnonymous && (
              <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">Anonymous</span>
            )}
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatTime(msg.createdAt)}</span>
          </div>

          {msg.replyTo && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800
              bg-white dark:bg-gray-950 px-3 py-1.5 text-sm">
              <Reply className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 truncate">{msg.replyTo.senderName}: {msg.replyTo.text}</span>
            </div>
          )}

          {/* Hide placeholder text when voice message is present */}
          {msg.text && msg.text !== "🎤 Voice message" && (
            <p className={`mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${msg.audioUrl ? "mt-2" : ""}`}>{msg.text}</p>
          )}

          {msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="mt-2 max-h-64 rounded-lg" />}
          {msg.audioUrl && (
            <div className="mt-2">
              <VoiceMessage audioUrl={msg.audioUrl} isOwnMessage={msg.senderId === profile?.uid} />
            </div>
          )}

          {/* Reactions */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const hasReacted = profile?.uid && users.includes(profile.uid);
              return (
                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all
                    ${hasReacted
                      ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950 text-green-600"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700"
                    }`}>
                  <span>{emoji}</span><span className="text-xs">{users.length}</span>
                </button>
              );
            })}

            {/* Quick react */}
            <div className="relative">
              <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                className="rounded-full p-1 text-gray-500 dark:text-gray-400 opacity-0 transition-all hover:bg-gray-100 dark:hover:bg-gray-800
                  hover:text-gray-900 dark:hover:text-gray-100 group-hover:opacity-100">
                <Smile className="h-4 w-4" />
              </button>
              {showEmojiPicker === msg.id && (
                <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-xl
                  border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-2 shadow-xl">
                  {reactionEmojis.map((emoji) => (
                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)}
                      className="rounded p-1.5 text-lg hover:bg-gray-100 dark:hover:bg-gray-800">{emoji}</button>
                  ))}
                </div>
              )}
            </div>

            {!isThread && (
              <button onClick={() => setSelectedThread(msg)}
                className="flex items-center gap-1 rounded-full p-1 text-gray-500 dark:text-gray-400 opacity-0
                  transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 group-hover:opacity-100">
                <MessageSquare className="h-4 w-4" />
                {msg.threadCount && msg.threadCount > 0 && <span className="text-xs">{msg.threadCount}</span>}
              </button>
            )}

            <button onClick={() => setReplyingTo(msg)}
              className="rounded-full p-1 text-gray-500 dark:text-gray-400 opacity-0 transition-all hover:bg-gray-100 dark:hover:bg-gray-800
                hover:text-gray-900 dark:hover:text-gray-100 group-hover:opacity-100">
              <Reply className="h-4 w-4" />
            </button>

            {msg.senderId === profile?.uid && (
              <button onClick={() => deleteMessage(msg.id, isThread)}
                className="rounded-full p-1 text-gray-500 dark:text-gray-400 opacity-0 transition-all hover:bg-red-50 dark:hover:bg-red-950
                  hover:text-red-500 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <LayoutWrapper>
      <div className="flex h-full bg-white dark:bg-gray-950">
        {/* Forum list sidebar */}
        <div className={`${showMobileForums ? "flex" : "hidden"} w-full flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 md:flex md:w-72`}>
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forums</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Connect with your community</p>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input type="text" placeholder="Search forums..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-2 pl-10 pr-4
                  text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-20">
            {filteredForums.map((forum) => {
              const Icon = forum.icon;
              return (
                <button key={forum.id}
                  onClick={() => { setSelectedForum(forum); setShowMobileForums(false); setSelectedThread(null); }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all
                    ${selectedForum?.id === forum.id
                      ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                      : "border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                    ${selectedForum?.id === forum.id ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <Icon className={`h-4 w-4 ${selectedForum?.id === forum.id ? "text-green-600" : "text-gray-500 dark:text-gray-400"}`} />
                  </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate
                      ${selectedForum?.id === forum.id ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      {forum.name}
                    </p>
                    {forum.lastPost && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{forum.lastPost}</p>
                    )}
                </div>
                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 md:hidden shrink-0" />
              </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className={`${showMobileForums ? "hidden" : "flex"} flex-1 flex-col md:flex`}>
          {selectedForum ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-3 backdrop-blur-xl">
                <button onClick={() => { setShowMobileForums(true); setSelectedThread(null); }}
                  className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <selectedForum.icon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedThread ? `Thread in ${selectedForum.name}` : selectedForum.name}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedThread ? `Replying to ${selectedThread.senderName}` : selectedForum.description}
                  </p>
                </div>
                {selectedThread && (
                  <button onClick={() => setSelectedThread(null)}
                    className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="h-5 w-5" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4" /><span className="text-xs">{selectedForum.memberCount}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                <div className="mx-auto max-w-3xl space-y-5">
                  {selectedThread ? (
                    <>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                        <MessageComponent msg={selectedThread} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                        <span>{threadReplies.length} {threadReplies.length === 1 ? "reply" : "replies"}</span>
                      </div>
                      {threadReplies.map((msg) => <MessageComponent key={msg.id} msg={msg} isThread />)}
                    </>
                  ) : (
                    <>
                      {messages.length === 0 && (
                        <div className="py-12 text-center">
                          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Be the first to share.</p>
                        </div>
                      )}
                      {messages.map((msg) => <MessageComponent key={msg.id} msg={msg} />)}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 p-4 backdrop-blur-xl"
                style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
                <div className="mx-auto max-w-3xl">
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-950 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Reply className="h-4 w-4 text-green-600" />
                        <span className="text-gray-500 dark:text-gray-400">Replying to</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{replyingTo.senderName}</span>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {selectedImage && (
                    <div className="relative mb-2 inline-block">
                      <img src={selectedImage} alt="Preview" className="h-20 rounded-lg" />
                      <button onClick={() => setSelectedImage(null)}
                        className="absolute -right-2 -top-2 rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {audioBlob && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-950 px-3 py-2">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 flex-1" />
                      <button onClick={() => setAudioBlob(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {isRecording ? (
                    /* ── Recording indicator ── */
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                      <span className="text-sm font-medium text-red-600">Recording {formatRecordingTime(recordingTime)}</span>
                      <div className="flex-1" />
                      <button onClick={() => { stopRecording(); setAudioBlob(null); }}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900">
                        Cancel
                      </button>
                      <button onClick={stopRecording}
                        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">
                        Stop
                      </button>
                    </div>
                  ) : (
                    /* ── Normal input ── */
                    <div className="flex gap-2">
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
                      
                      <button onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100">
                        <ImageIcon className="h-5 w-5" />
                      </button>

                      <button onClick={startRecording}
                        className="rounded-lg p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100">
                        <Mic className="h-5 w-5" />
                      </button>

                      <input
                        type="text"
                        placeholder={selectedThread ? "Reply in thread..." : `Message #${selectedForum.name.toLowerCase()}`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage(!!selectedThread)}
                        disabled={sending}
                        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5
                          text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors
                          focus:border-green-500 focus:outline-none disabled:opacity-50"
                      />
                      
                      <button onClick={() => sendMessage(!!selectedThread)}
                        disabled={sending || (!inputText.trim() && !audioBlob && !selectedImage)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                          bg-green-600 text-white transition-all hover:bg-green-700
                          disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.92]">
                        {sending ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* This should never show now since we auto-select, but as fallback: */
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Select a forum to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
