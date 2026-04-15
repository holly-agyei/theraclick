"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Search, MessageCircle, UserCheck, Users, Sparkles,
  ArrowRight, Brain, PenSquare, MoreHorizontal, Pin, BellOff, Trash2,
  Lock, CheckCheck, Check,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { StudentChatPanel } from "@/components/StudentChatPanel";

type FilterTab = "all" | "counselor" | "peer-mentor" | "unread";

interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSenderId?: string;
  lastMessageRead?: boolean;
  type: "counselor" | "peer-mentor";
  avatar?: string;
  otherUserId: string;
  unreadCount: number;
  isOnline?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatTimestamp(date?: Date): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StudentInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("chat"));
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const userCacheRef = useRef<Record<string, { name: string; role: string; avatar?: string; isOnline?: boolean } | null>>({});

  useEffect(() => {
    function handleClickOutside() { setMenuOpenId(null); }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile || !db) return;

    const convQuery = query(
      collection(db, "directMessages"),
      where("participants", "array-contains", profile.uid)
    );
    const cache = userCacheRef.current;

    const unsub = onSnapshot(convQuery, async (snap) => {
      const list: Conversation[] = [];
      const seen = new Set<string>();

      for (const convDoc of snap.docs) {
        const data = convDoc.data();
        const participants = data.participants as string[];
        const otherUserId = participants.find(p => p !== profile.uid);
        if (!otherUserId || seen.has(otherUserId)) continue;
        seen.add(otherUserId);

        if (!(otherUserId in cache)) {
          try {
            const userDoc = await getDoc(doc(db!, "users", otherUserId));
            if (!userDoc.exists()) { cache[otherUserId] = null; continue; }
            const u = userDoc.data();
            if (u.role !== "counselor" && u.role !== "peer-mentor") { cache[otherUserId] = null; continue; }
            cache[otherUserId] = {
              name: u.fullName || "Unknown",
              role: u.role,
              avatar: u.avatar || u.profilePicture || undefined,
              isOnline: u.isOnline || false,
            };
          } catch { cache[otherUserId] = null; continue; }
        }

        const user = cache[otherUserId];
        if (!user) continue;

        // Use the canonical chatId (same as chat panels) for subcollection queries.
        // convDoc.id might differ from the canonical ID if a legacy document exists.
        const canonicalChatId = [profile.uid, otherUserId].sort().join("_");

        let lastMessage: string | undefined = data.lastMessage || undefined;
        let lastMessageTime: Date | undefined = data.lastMessageTime?.toDate?.() ?? undefined;
        let lastMessageSenderId: string | undefined = data.lastMessageSender || undefined;
        try {
          const msgSnap = await getDocs(
            query(collection(db!, "directMessages", canonicalChatId, "messages"), orderBy("createdAt", "desc"), limit(1))
          );
          if (!msgSnap.empty) {
            const msgData = msgSnap.docs[0].data();
            lastMessage = msgData.text || lastMessage;
            lastMessageTime = msgData.createdAt?.toDate?.() ?? lastMessageTime;
            lastMessageSenderId = msgData.senderId || lastMessageSenderId;
          }
        } catch { /* fall back to parent doc fields */ }

        // Read lastRead + unread from the canonical document (chat panels write there)
        let canonicalData = data;
        if (convDoc.id !== canonicalChatId) {
          try {
            const canonSnap = await getDoc(doc(db!, "directMessages", canonicalChatId));
            if (canonSnap.exists()) canonicalData = canonSnap.data();
          } catch { /* use snapshot data as fallback */ }
        }

        let lastMessageRead = false;
        const otherLastRead = canonicalData[`lastRead_${otherUserId}`];
        if (lastMessageSenderId === profile.uid && otherLastRead?.toDate && lastMessageTime) {
          lastMessageRead = otherLastRead.toDate().getTime() >= lastMessageTime.getTime();
        }

        list.push({
          id: canonicalChatId,
          name: user.name,
          lastMessage,
          lastMessageTime,
          lastMessageSenderId,
          lastMessageRead,
          type: user.role === "counselor" ? "counselor" : "peer-mentor",
          avatar: user.avatar,
          otherUserId,
          unreadCount: canonicalData[`unread_${profile.uid}`] || 0,
          isOnline: user.isOnline,
        });
      }

      list.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setConversations(list);
      setLoading(false);
    }, (err) => {
      console.error("Inbox listener:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (activeFilter === "counselor") list = list.filter(c => c.type === "counselor");
    else if (activeFilter === "peer-mentor") list = list.filter(c => c.type === "peer-mentor");
    else if (activeFilter === "unread") list = list.filter(c => c.unreadCount > 0);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, activeFilter, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: conversations.length,
    counselor: conversations.filter(c => c.type === "counselor").length,
    "peer-mentor": conversations.filter(c => c.type === "peer-mentor").length,
    unread: conversations.filter(c => c.unreadCount > 0).length,
  }), [conversations]);

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + c.unreadCount, 0), [conversations]);

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "counselor", label: "Counselors" },
    { id: "peer-mentor", label: "Peer Mentors" },
    { id: "unread", label: "Unread" },
  ];

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedId(conv.otherUserId);
    setMenuOpenId(null);
    if (conv.unreadCount > 0) {
      setConversations((prev) => prev.map((c) => c.otherUserId === conv.otherUserId ? { ...c, unreadCount: 0 } : c));
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "directMessages", convId));
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (conversations.find(c => c.id === convId)?.otherUserId === selectedId) {
        setSelectedId(null);
      }
    } catch (e) { console.error("Delete failed:", e); }
    setMenuOpenId(null);
  };

  const getFilterEmptyState = () => {
    if (searchQuery) {
      return {
        icon: <Search className="h-8 w-8 text-gray-300" />,
        title: `No results for "${searchQuery}"`,
        subtitle: "Try a different search term",
        cta: null,
      };
    }
    switch (activeFilter) {
      case "counselor":
        return {
          icon: <UserCheck className="h-8 w-8 text-gray-300" />,
          title: "No counselor conversations yet",
          subtitle: "Connect with a certified counselor to get started",
          cta: (
            <button onClick={() => router.push("/student/counselors")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0F4F47] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
              Find a Counselor <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ),
        };
      case "peer-mentor":
        return {
          icon: <Users className="h-8 w-8 text-gray-300" />,
          title: "No peer mentor conversations yet",
          subtitle: "Peer mentors are fellow students who understand what you're going through",
          cta: (
            <button onClick={() => router.push("/student/peer-mentors")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0F4F47] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
              Find a Peer Mentor <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ),
        };
      case "unread":
        return {
          icon: <CheckCheck className="h-8 w-8 text-[#2BB5A0]" />,
          title: "You're all caught up!",
          subtitle: "No unread messages right now",
          cta: null,
        };
      default:
        return {
          icon: <MessageCircle className="h-8 w-8 text-gray-300" />,
          title: "No conversations found",
          subtitle: "",
          cta: null,
        };
    }
  };

  return (
    <LayoutWrapper>
      <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-950">
        {/* Left Panel: Conversation List */}
        <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 ${
          selectedId ? "hidden lg:flex lg:w-[380px] xl:w-[420px]" : "w-full lg:w-[380px] xl:w-[420px]"
        } shrink-0`}>

          {/* Header */}
          <div className="shrink-0 px-5 pt-6 pb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inbox</h1>
                {totalUnread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2BB5A0] px-1.5 text-[10px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button onClick={() => router.push("/student/counselors")}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#0F4F47] hover:bg-[#0F4F47]/5 transition-colors"
                title="New conversation">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {loading ? "Loading..." : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Filter chips */}
          <div className="shrink-0 px-4 pb-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const isActive = activeFilter === tab.id;
                const count = tabCounts[tab.id];
                return (
                  <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#0F4F47] text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}>
                    {tab.label}
                    {count > 0 && (
                      <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.id === "unread" ? "bg-[#2BB5A0] text-white" :
                            "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          {conversations.length > 0 && (
            <div className="shrink-0 px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search conversations..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:bg-white dark:focus:bg-gray-950 focus:outline-none transition-colors" />
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 px-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[76px] animate-pulse rounded-lg bg-gray-50 dark:bg-gray-900" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-10">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0F4F47]/10">
                    <MessageCircle className="h-7 w-7 text-[#0F4F47]" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold text-gray-900 dark:text-gray-100">No conversations yet</h3>
                  <p className="mt-1 text-[14px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Start chatting with a counselor or peer mentor to see your messages here.
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-3">
                    <button onClick={() => router.push("/student/counselors")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
                      <UserCheck className="h-4 w-4" /> Find a Counselor
                    </button>
                    <button onClick={() => router.push("/student/peer-mentors")}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-[#0F4F47] hover:bg-[#0F4F47] hover:text-white transition-colors">
                      <Users className="h-4 w-4" /> Find a Peer Mentor
                    </button>
                    <button onClick={() => router.push("/student/chat")}
                      className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2BB5A0] hover:underline">
                      <Sparkles className="h-3.5 w-3.5" /> Or chat with our AI now
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[#2BB5A0]/15 bg-[#2BB5A0]/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F4F47]/10">
                      <Brain className="h-4 w-4 text-[#0F4F47]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Not sure where to start?</p>
                      <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                        Most students find it easier to message a peer mentor first. They&apos;re fellow students who understand exactly what you&apos;re going through.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="mb-3 text-[15px] font-semibold text-gray-900 dark:text-gray-100">Suggested for you</h3>
                  <div className="space-y-2">
                    <button onClick={() => router.push("/student/counselors")}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10">
                        <UserCheck className="h-5 w-5 text-[#0F4F47]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Browse Counselors</p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">Certified professionals</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2BB5A0] transition-colors" />
                    </button>
                    <button onClick={() => router.push("/student/peer-mentors")}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2BB5A0]/10">
                        <Users className="h-5 w-5 text-[#2BB5A0]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Peer Mentors</p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">Students who&apos;ve been there</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2BB5A0] transition-colors" />
                    </button>
                    <button onClick={() => router.push("/student/chat")}
                      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-left transition-all hover:border-[#2BB5A0] hover:shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">AI Chat</p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">Available 24/7, private</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#2BB5A0] transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              (() => {
                const empty = getFilterEmptyState();
                return (
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
                      {empty.icon}
                    </div>
                    <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">{empty.title}</p>
                    {empty.subtitle && <p className="mt-1 text-[13px] text-gray-400 max-w-[260px] mx-auto">{empty.subtitle}</p>}
                    {empty.cta}
                  </div>
                );
              })()
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filtered.map((conv) => {
                  const isSelected = selectedId === conv.otherUserId;
                  const hasUnread = conv.unreadCount > 0;
                  const isMenuOpen = menuOpenId === conv.id;

                  return (
                    <div key={conv.id} className="relative group">
                      <button
                        onClick={() => handleSelectConversation(conv)}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                          isSelected
                            ? "bg-[#0F4F47]/5"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}>
                        {/* Avatar with online/unread indicators */}
                        <div className="relative shrink-0">
                          {conv.avatar ? (
                            <img src={conv.avatar} alt={conv.name}
                              className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4F47] text-sm font-bold text-white">
                              {getInitials(conv.name)}
                            </div>
                          )}
                          {conv.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-950 bg-green-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate text-[14px] ${hasUnread ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-800 dark:text-gray-200"}`}>
                              {conv.name}
                            </span>
                            <span className={`shrink-0 text-[11px] ${hasUnread ? "font-semibold text-[#2BB5A0]" : "text-gray-400"}`}>
                              {formatTimestamp(conv.lastMessageTime)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] text-gray-400 mr-1.5">
                                {conv.type === "counselor" ? "Counselor" : "Peer Mentor"}
                              </span>
                              {conv.lastMessage && (
                                <span className={`flex items-center gap-1 mt-0.5 ${hasUnread ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                                  {conv.lastMessageSenderId === profile?.uid && (
                                    conv.lastMessageRead
                                      ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-[#2BB5A0]" />
                                      : <Check className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                  )}
                                  <span className="text-[13px] truncate">{conv.lastMessage}</span>
                                </span>
                              )}
                            </div>
                            {hasUnread && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2BB5A0] px-1 text-[10px] font-bold text-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Hover ... menu trigger */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : conv.id); }}
                        className={`absolute right-3 top-3 rounded-md p-1 transition-opacity ${
                          isMenuOpen ? "opacity-100 bg-gray-100 dark:bg-gray-800" : "opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}>
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>

                      {/* Dropdown menu */}
                      {isMenuOpen && (
                        <div className="absolute right-3 top-10 z-50 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}>
                          <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <Pin className="h-3.5 w-3.5" /> Pin conversation
                          </button>
                          <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <BellOff className="h-3.5 w-3.5" /> Mute notifications
                          </button>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button onClick={() => handleDeleteConversation(conv.id)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" /> Delete conversation
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat or empty state */}
        <div className={`flex-1 ${selectedId ? "flex" : "hidden lg:flex"} flex-col`}>
          {selectedId ? (
            <StudentChatPanel
              otherUserId={selectedId}
              onBack={() => setSelectedId(null)}
              embedded
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center px-8 max-w-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F4F47]/5">
                  <MessageCircle className="h-7 w-7 text-[#0F4F47]/40" />
                </div>
                <p className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">
                  Select a conversation to continue chatting
                </p>
                <p className="mt-2 text-[13px] text-gray-400 leading-relaxed">
                  Pick someone from the list on the left, or start a new conversation with a counselor or peer mentor.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-gray-400">
                  <Lock className="h-3 w-3" />
                  Your messages are private and confidential
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
