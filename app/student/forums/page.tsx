"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Hash, Search, Send, Smile, Image as ImageIcon, Trash2, Users,
  MessageSquare, ChevronRight, X, Reply, ChevronDown,
  BookOpen, Heart, GraduationCap, Shield, Leaf, Lock,
  Flag, MoreHorizontal, Pin, Stethoscope, UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  updateDoc, doc, deleteDoc, arrayUnion, arrayRemove, getDocs, where, setDoc, getDoc,
} from "firebase/firestore";
import { notifyForumReply } from "@/lib/notify";
import { db } from "@/lib/firebase";

interface Forum {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  emoji: string;
  color: { bg: string; text: string; activeBg: string };
  memberCount: number;
  lastPost?: string;
  pinnedMessage?: string;
  unread?: number;
}

interface ForumMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole?: "counselor" | "peer-mentor" | "student";
  createdAt: Date;
  reactions: Record<string, string[]>;
  imageUrl?: string;
  audioUrl?: string;
  isAnonymous: boolean;
  replyTo?: { id: string; text: string; senderName: string };
  threadCount?: number;
}

const REACTION_EMOJIS = ["❤️", "👍", "🙏", "💪", "🤗", "😢", "🔥", "💯"];

const FORUMS: Forum[] = [
  { id: "general", name: "General", description: "A place for everyone to connect", icon: MessageSquare, emoji: "", color: { bg: "bg-[#0F4F47]/10", text: "text-[#0F4F47]", activeBg: "bg-[#0F4F47]/15" }, memberCount: 342, lastPost: "Welcome! We're all here to support each other.", pinnedMessage: "Welcome to Theraklick forums. Be kind, be anonymous, be yourself." },
  { id: "exam-stress", name: "Exam Stress", description: "Support through exam season", icon: BookOpen, emoji: "", color: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600", activeBg: "bg-orange-100 dark:bg-orange-900/40" }, memberCount: 189, lastPost: "Finals week is here. How is everyone coping?", pinnedMessage: "Exam season tips from our counselors — take breaks, sleep well, and ask for help early." },
  { id: "anxiety-support", name: "Anxiety Support", description: "A safe space to share", icon: Leaf, emoji: "", color: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-600", activeBg: "bg-sky-100 dark:bg-sky-900/40" }, memberCount: 156, lastPost: "Breathing exercises that actually help.", pinnedMessage: "If you're in crisis, please reach out to a counselor immediately. You're not alone." },
  { id: "relationships", name: "Relationships", description: "Navigate friendships and family", icon: Heart, emoji: "", color: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-500", activeBg: "bg-rose-100 dark:bg-rose-900/40" }, memberCount: 98, lastPost: "How do you set boundaries with people you love?", pinnedMessage: "Respect everyone's experiences. What works for one person may not work for another." },
  { id: "first-year", name: "First Year Life", description: "For freshers navigating uni", icon: GraduationCap, emoji: "", color: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600", activeBg: "bg-violet-100 dark:bg-violet-900/40" }, memberCount: 234, lastPost: "Anyone else feeling lost in their first semester?", pinnedMessage: "Every senior was once a confused fresher. You belong here." },
  { id: "self-care", name: "Self Care Corner", description: "Tips for taking care of yourself", icon: Shield, emoji: "", color: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600", activeBg: "bg-emerald-100 dark:bg-emerald-900/40" }, memberCount: 178, lastPost: "Small daily habits that changed my wellbeing.", pinnedMessage: "Self care isn't selfish — it's survival. Share what helps you recharge." },
];

const DEMO_MESSAGES: Record<string, ForumMessage[]> = {
  general: [
    { id: "1", text: "Hey everyone! Just joined Theraklick. Feeling a bit overwhelmed but hoping to find some support here.", senderId: "user1", senderName: "Anonymous Owl", senderRole: "student", createdAt: new Date(Date.now() - 3600000 * 2), reactions: { "❤️": ["user2", "user3"], "🤗": ["user4"] }, isAnonymous: true, threadCount: 2 },
    { id: "2", text: "Welcome! You're in the right place. We're all here to support each other.\n\nWhat's been on your mind lately?", senderId: "user2", senderName: "Peaceful Bear", senderRole: "student", createdAt: new Date(Date.now() - 3600000 * 1.5), reactions: { "👍": ["user1"] }, isAnonymous: true, replyTo: { id: "1", text: "Hey everyone! Just joined Theraklick...", senderName: "Anonymous Owl" } },
    { id: "3", text: "Same here! Just started my second year and the pressure is real. But talking about it helps a lot.", senderId: "user3", senderName: "Brave Lion", senderRole: "student", createdAt: new Date(Date.now() - 3600000), reactions: { "💪": ["user1", "user2"] }, isAnonymous: true },
    { id: "4", text: "Remember, it's completely normal to feel overwhelmed when you're adjusting. Take things one day at a time. My DMs are always open if anyone needs to talk.", senderId: "counselor1", senderName: "Calm River", senderRole: "counselor", createdAt: new Date(Date.now() - 1800000), reactions: { "❤️": ["user1", "user2", "user3"], "🙏": ["user1"] }, isAnonymous: true },
  ],
  "exam-stress": [
    { id: "1", text: "Finals week is really getting to me. Anyone else feeling completely unprepared?", senderId: "user5", senderName: "Tired Phoenix", senderRole: "student", createdAt: new Date(Date.now() - 7200000), reactions: { "🤗": ["user9"] }, isAnonymous: true, threadCount: 5 },
    { id: "2", text: "You got this! Remember: one exam at a time. What subject is stressing you most?", senderId: "user6", senderName: "Calm Eagle", senderRole: "peer-mentor", createdAt: new Date(Date.now() - 3600000), reactions: { "❤️": ["user5"] }, isAnonymous: true, replyTo: { id: "1", text: "Finals week is really getting to me...", senderName: "Tired Phoenix" } },
  ],
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function truncateAtWord(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
}

export default function ForumsPage() {
  const { profile } = useAuth();
  const [forums] = useState<Forum[]>(FORUMS);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(FORUMS[0]);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileForums, setShowMobileForums] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumMessage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(true);

  // Join gate state
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isJoined = selectedForum ? joinedRooms.has(selectedForum.id) : false;
  const anonName = profile?.anonymousId || profile?.fullName || "Anonymous";

  // Load joined rooms from Firestore
  useEffect(() => {
    async function loadJoined() {
      if (!profile || !db) return;
      try {
        const snap = await getDocs(query(collection(db, "forumMembers"), where("userId", "==", profile.uid)));
        const rooms = new Set<string>();
        snap.docs.forEach((d) => { const data = d.data(); if (data.roomId) rooms.add(data.roomId); });
        setJoinedRooms(rooms);
      } catch { /* first time */ }
    }
    void loadJoined();
  }, [profile]);

  const handleJoinRoom = async () => {
    if (!profile || !selectedForum) return;
    const roomId = selectedForum.id;
    setJoinedRooms((prev) => new Set(prev).add(roomId));
    setShowJoinModal(false);
    setJustJoined(true);
    setTimeout(() => setJustJoined(false), 4000);

    if (db) {
      try {
        await addDoc(collection(db, "forumMembers"), { userId: profile.uid, roomId, joinedAt: serverTimestamp() });
      } catch { /* ok */ }
      try {
        await updateDoc(doc(db, "users", profile.uid), { joinedForums: arrayUnion(roomId) });
      } catch { /* ok */ }
    }
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, threadReplies, scrollToBottom]);

  // Load messages
  useEffect(() => {
    if (!selectedForum) { setMessages([]); return; }
    setShowPinned(true);

    if (db) {
      const q = query(collection(db, "forums", selectedForum.id, "messages"), orderBy("createdAt", "asc"));
      let mounted = true;
      const unsub = onSnapshot(q, (snap) => {
        if (!mounted) return;
        if (snap.empty) {
          setMessages(DEMO_MESSAGES[selectedForum.id] || []);
        } else {
          setMessages(snap.docs.map((d) => ({
            id: d.id, ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date(),
            reactions: d.data().reactions || {},
            isAnonymous: d.data().isAnonymous ?? true,
          })) as ForumMessage[]);
        }
      }, () => { if (mounted) setMessages(DEMO_MESSAGES[selectedForum.id] || []); });
      return () => { mounted = false; unsub(); };
    } else {
      setMessages(DEMO_MESSAGES[selectedForum.id] || []);
    }
  }, [selectedForum]);

  // Thread replies
  useEffect(() => {
    if (!selectedThread || !selectedForum || !db) { setThreadReplies([]); return; }
    const q = query(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), orderBy("createdAt", "asc"));
    let mounted = true;
    const unsub = onSnapshot(q, (snap) => {
      if (!mounted) return;
      setThreadReplies(snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        reactions: d.data().reactions || {},
        isAnonymous: d.data().isAnonymous ?? true,
      })) as ForumMessage[]);
    }, () => { if (mounted) setThreadReplies([]); });
    return () => { mounted = false; unsub(); };
  }, [selectedThread, selectedForum]);

  const sendMessage = async (isThreadReply = false) => {
    if (!inputText.trim() && !selectedImage) return;
    if (!selectedForum || !profile || !isJoined) return;

    setSending(true);
    try {
      const displayName = (profile.anonymousEnabled && profile.anonymousId ? profile.anonymousId : profile.fullName) || "Anonymous";
      const newMessage: Partial<ForumMessage> = {
        text: inputText.trim(),
        senderId: profile.uid,
        senderName: displayName,
        senderRole: profile.role as ForumMessage["senderRole"],
        createdAt: new Date(),
        reactions: {},
        isAnonymous: profile.anonymousEnabled || false,
        imageUrl: selectedImage || undefined,
      };

      if (replyingTo && !isThreadReply) {
        newMessage.replyTo = { id: replyingTo.id, text: truncateAtWord(replyingTo.text, 60), senderName: replyingTo.senderName };
      }

      setInputText("");
      setReplyingTo(null);
      setSelectedImage(null);

      if (db && profile?.uid) {
        const msgData = {
          text: newMessage.text || "",
          senderId: profile.uid,
          senderName: newMessage.senderName || "Anonymous",
          senderRole: newMessage.senderRole || "student",
          createdAt: serverTimestamp(),
          reactions: {},
          isAnonymous: newMessage.isAnonymous || false,
          ...(newMessage.imageUrl && { imageUrl: newMessage.imageUrl }),
          ...(newMessage.replyTo && { replyTo: newMessage.replyTo }),
        };

        if (isThreadReply && selectedThread) {
          await addDoc(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), msgData);
          await updateDoc(doc(db, "forums", selectedForum.id, "messages", selectedThread.id), { threadCount: (selectedThread.threadCount || 0) + 1 });

          // Notify the original poster about the reply
          if (selectedThread.senderId && selectedThread.senderId !== profile.uid) {
            const origSnap = await getDoc(doc(db, "users", selectedThread.senderId));
            const origData = origSnap.data();
            if (origData?.email) {
              const appUrl = window.location.origin;
              notifyForumReply(
                selectedThread.senderId, origData.email, origData.name || "",
                newMessage.senderName || "Someone", selectedForum.name,
                (newMessage.text || "").slice(0, 80), appUrl
              );
            }
          }
        } else {
          await addDoc(collection(db, "forums", selectedForum.id, "messages"), msgData);

          // Notify original poster if this is a quoted reply
          if (replyingTo && replyingTo.senderId && replyingTo.senderId !== profile.uid) {
            const origSnap = await getDoc(doc(db, "users", replyingTo.senderId));
            const origData = origSnap.data();
            if (origData?.email) {
              const appUrl = window.location.origin;
              notifyForumReply(
                replyingTo.senderId, origData.email, origData.name || "",
                newMessage.senderName || "Someone", selectedForum.name,
                (newMessage.text || "").slice(0, 80), appUrl
              );
            }
          }
        }
      } else {
        const local = { id: Date.now().toString(), ...newMessage, createdAt: new Date() } as ForumMessage;
        if (isThreadReply) setThreadReplies((prev) => [...prev, local]);
        else setMessages((prev) => [...prev, local]);
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

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (Math.floor(hours / 24) === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const filteredForums = forums.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Message Component ──────────────────────────────────────────
  const MessageComponent = ({ msg, isThread = false }: { msg: ForumMessage; isThread?: boolean }) => {
    const isOwn = msg.senderId === profile?.uid;
    const isCounselor = msg.senderRole === "counselor";
    const isMentor = msg.senderRole === "peer-mentor";

    return (
      <div className="group relative"
        onMouseEnter={() => setHoveredMsg(msg.id)}
        onMouseLeave={() => { setHoveredMsg(null); if (showEmojiPicker === msg.id) setShowEmojiPicker(null); }}>
        <div className="flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50">
          {/* Avatar */}
          <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isCounselor ? "bg-blue-100 dark:bg-blue-900 text-blue-600" :
            isMentor ? "bg-amber-100 dark:bg-amber-900 text-amber-600" :
            "bg-green-100 dark:bg-green-900 text-green-600"}`}>
            {getInitials(msg.senderName)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + role badge + time */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{msg.senderName}</span>
              {isCounselor && (
                <span className="flex items-center gap-0.5 rounded-full bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                  <Stethoscope className="h-2.5 w-2.5" /> Counselor
                </span>
              )}
              {isMentor && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                  <UserCheck className="h-2.5 w-2.5" /> Mentor
                </span>
              )}
              {msg.isAnonymous && !isCounselor && !isMentor && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">Anonymous</span>
              )}
              <span className="text-[11px] text-gray-400">{formatTime(msg.createdAt)}</span>
            </div>

            {/* Reply quote */}
            {msg.replyTo && (
              <div className="mt-1.5 flex items-start gap-2 rounded-lg border-l-2 border-[#2BB5A0] bg-[#2BB5A0]/5 px-3 py-1.5">
                <Reply className="mt-0.5 h-3 w-3 shrink-0 text-[#2BB5A0]" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-[#2BB5A0]">{msg.replyTo.senderName}</span>
                  <p className="text-[12px] text-gray-500 truncate">{msg.replyTo.text}</p>
                </div>
              </div>
            )}

            {/* Message text */}
            {msg.text && msg.text !== "🎤 Voice message" && (
              <p className="mt-1 text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.text}</p>
            )}

            {msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="mt-2 max-h-64 rounded-xl" />}

            {/* Reactions */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {Object.entries(msg.reactions).map(([emoji, users]) => {
                const hasReacted = profile?.uid && users.includes(profile.uid);
                return (
                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] transition-all ${
                      hasReacted ? "border-[#2BB5A0] bg-[#2BB5A0]/10 text-[#2BB5A0]" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-500 hover:border-gray-300"}`}>
                    <span>{emoji}</span><span className="text-[11px]">{users.length}</span>
                  </button>
                );
              })}

              {/* Thread count */}
              {!isThread && msg.threadCount && msg.threadCount > 0 && (
                <button onClick={() => setSelectedThread(msg)}
                  className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-800 px-2 py-0.5 text-[11px] text-gray-500 hover:border-[#2BB5A0] hover:text-[#2BB5A0]">
                  <MessageSquare className="h-3 w-3" /> {msg.threadCount} {msg.threadCount === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          </div>

          {/* Hover action bar */}
          {hoveredMsg === msg.id && (
            <div className="absolute right-2 -top-3 z-10 flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 py-0.5 shadow-lg">
              <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600" title="React">
                <Smile className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setReplyingTo(msg)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600" title="Reply">
                <Reply className="h-3.5 w-3.5" />
              </button>
              {!isThread && (
                <button onClick={() => setSelectedThread(msg)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600" title="Thread">
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
              <button className="rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500" title="Report">
                <Flag className="h-3.5 w-3.5" />
              </button>
              {isOwn && (
                <button onClick={() => deleteMessage(msg.id, isThread)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Emoji picker dropdown */}
          {showEmojiPicker === msg.id && (
            <div className="absolute right-2 -top-12 z-20 flex gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-xl">
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)}
                  className="rounded-lg p-1.5 text-[18px] hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-all">{emoji}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <LayoutWrapper>
      <div className="flex h-full bg-white dark:bg-gray-950">
        {/* ── Sidebar ── */}
        <div className={`${showMobileForums ? "flex" : "hidden"} w-full flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 md:flex md:w-72`}>
          <div className="border-b border-gray-200 dark:border-gray-800 p-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Forums</h1>
            <p className="text-[13px] text-gray-500">Connect with your community</p>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search forums..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-2 pl-9 pr-4 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-20">
            {filteredForums.map((forum) => {
              const Icon = forum.icon;
              const active = selectedForum?.id === forum.id;
              const joined = joinedRooms.has(forum.id);
              return (
                <button key={forum.id}
                  onClick={() => { setSelectedForum(forum); setShowMobileForums(false); setSelectedThread(null); }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                    active ? "bg-[#0F4F47]/5 border border-[#2BB5A0]/20" : "border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? forum.color.activeBg : forum.color.bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${forum.color.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-medium truncate ${active ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                        {forum.name}
                      </p>
                      {joined && <span className="h-1.5 w-1.5 rounded-full bg-[#2BB5A0] shrink-0" title="Joined" />}
                    </div>
                    {forum.lastPost && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{truncateAtWord(forum.lastPost, 38)}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{forum.memberCount} members</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 md:hidden shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main ── */}
        <div className={`${showMobileForums ? "hidden" : "flex"} flex-1 flex-col md:flex`}>
          {selectedForum ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-3 backdrop-blur-xl">
                <button onClick={() => { setShowMobileForums(true); setSelectedThread(null); }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedForum.color.activeBg}`}>
                  <selectedForum.icon className={`h-4.5 w-4.5 ${selectedForum.color.text}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-gray-400" />
                    <h2 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
                      {selectedThread ? `Thread in ${selectedForum.name}` : selectedForum.name}
                    </h2>
                  </div>
                  <p className="text-[12px] text-gray-400">
                    {selectedThread ? `Replying to ${selectedThread.senderName}` : selectedForum.description}
                  </p>
                </div>
                {selectedThread && (
                  <button onClick={() => setSelectedThread(null)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="h-5 w-5" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span className="text-[12px] font-medium">{selectedForum.memberCount} members</span>
                </div>
              </div>

              {/* Pinned message */}
              {showPinned && selectedForum.pinnedMessage && !selectedThread && (
                <div className="flex items-start gap-2 border-b border-gray-100 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 md:px-6">
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="flex-1 text-[12px] text-gray-600 dark:text-gray-400">{selectedForum.pinnedMessage}</p>
                  <button onClick={() => setShowPinned(false)} className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Just joined confirmation */}
              {justJoined && (
                <div className="flex items-center justify-center gap-2 border-b border-[#2BB5A0]/20 bg-[#2BB5A0]/5 px-4 py-2">
                  <Lock className="h-3.5 w-3.5 text-[#2BB5A0]" />
                  <p className="text-[12px] font-medium text-[#2BB5A0]">You&apos;ve joined #{selectedForum.name}! You can now post messages.</p>
                </div>
              )}

              {/* Messages area — anchored to bottom */}
              <div ref={messagesContainerRef} className="flex flex-1 flex-col justify-end overflow-y-auto px-4 py-4 md:px-6">
                <div className="mx-auto w-full max-w-3xl space-y-1">
                  {selectedThread ? (
                    <>
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3">
                        <MessageComponent msg={selectedThread} />
                      </div>
                      <div className="flex items-center gap-2 py-2 text-[12px] text-gray-400">
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
                          <p className="text-[14px] text-gray-400">No messages yet. Be the first to share.</p>
                        </div>
                      )}
                      {messages.map((msg) => <MessageComponent key={msg.id} msg={msg} />)}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input area */}
              <div className="border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 p-4 backdrop-blur-xl"
                style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
                <div className="mx-auto max-w-3xl">
                  {/* Join gate */}
                  {!isJoined ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-6 py-5 text-center">
                      <Lock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">Join #{selectedForum.name} to participate</p>
                        <p className="mt-0.5 text-[12px] text-gray-400">You can read messages, but you need to join to post.</p>
                      </div>
                      <button onClick={() => setShowJoinModal(true)}
                        className="rounded-xl bg-[#0F4F47] px-6 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E] transition-colors">
                        Join Forum
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Reply indicator */}
                      {replyingTo && (
                        <div className="mb-2 flex items-center justify-between rounded-lg border-l-2 border-[#2BB5A0] bg-[#2BB5A0]/5 px-3 py-2">
                          <div className="flex items-center gap-2 text-[13px]">
                            <Reply className="h-3.5 w-3.5 text-[#2BB5A0]" />
                            <span className="text-gray-400">Replying to</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{replyingTo.senderName}</span>
                            <span className="text-gray-400 truncate max-w-[200px]">— {truncateAtWord(replyingTo.text, 40)}</span>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </div>
                      )}

                      {selectedImage && (
                        <div className="relative mb-2 inline-block">
                          <img src={selectedImage} alt="Preview" className="h-20 rounded-xl" />
                          <button onClick={() => setSelectedImage(null)}
                            className="absolute -right-2 -top-2 rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-gray-700 hover:bg-gray-200">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Anonymous reminder + input */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Lock className="h-3 w-3 text-[#2BB5A0]" />
                        <p className="text-[11px] text-gray-400">You&apos;re posting as <span className="font-semibold text-[#2BB5A0]">{anonName}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                          className="rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors">
                          <ImageIcon className="h-5 w-5" />
                        </button>
                        <input type="text"
                          placeholder={selectedThread ? "Reply in thread..." : `Message #${selectedForum.name.toLowerCase()}`}
                          value={inputText} onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage(!!selectedThread)}
                          disabled={sending}
                          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:outline-none disabled:opacity-50" />
                        <button onClick={() => sendMessage(!!selectedThread)}
                          disabled={sending || (!inputText.trim() && !selectedImage)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F4F47] text-white transition-all hover:bg-[#1A7A6E] disabled:opacity-30 active:scale-[0.92]">
                          {sending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-[14px] text-gray-400">Select a forum to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join modal */}
      {showJoinModal && selectedForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${selectedForum.color.activeBg}`}>
              <selectedForum.icon className={`h-6 w-6 ${selectedForum.color.text}`} />
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-gray-100">Join #{selectedForum.name}?</h3>
            <p className="mt-1 text-[14px] text-gray-500">{selectedForum.description}</p>
            <p className="mt-3 text-[12px] text-gray-400">
              {selectedForum.memberCount} members · By joining, you&apos;ll be able to post messages and react. Your identity stays anonymous.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowJoinModal(false)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleJoinRoom}
                className="flex-1 rounded-xl bg-[#0F4F47] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
                Join Forum
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}
