"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Search, MessageCircle,
  Settings, Calendar, Flag, CheckCircle, Check, CheckCheck,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";
import { CounselorChatPanel } from "@/components/CounselorChatPanel";

interface Conversation {
  studentId: string;
  chatId: string;
  studentName: string;
  studentRealName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageSender?: string;
  lastMessageRead?: boolean;
  unreadCount: number;
  status: "active" | "follow-up" | "resolved" | "archived";
}

type Tab = "all" | "unread" | "follow-up" | "resolved";

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
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CounselorInboxPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Cache student data so we don't re-fetch on every snapshot
  const studentCacheRef = useRef<Record<string, { name: string; realName: string } | null>>({});

  useEffect(() => {
    if (!profile || !db) return;

    const convQuery = query(
      collection(db, "directMessages"),
      where("participants", "array-contains", profile.uid)
    );

    const unsub = onSnapshot(convQuery, async (snap) => {
      const list: Conversation[] = [];
      const seenStudentIds = new Set<string>();
      const cache = studentCacheRef.current;

      for (const convDoc of snap.docs) {
        const data = convDoc.data();
        const chatId = convDoc.id;
        const participantIds = data.participants as string[];

        const studentId = participantIds.find((p) => p !== profile.uid);
        if (!studentId || seenStudentIds.has(studentId)) continue;
        seenStudentIds.add(studentId);

        // Use cached student data, or fetch once
        if (!(studentId in cache)) {
          try {
            const studentDoc = await getDoc(doc(db!, "users", studentId));
            if (!studentDoc.exists()) { cache[studentId] = null; continue; }
            const sd = studentDoc.data();
            if (sd.role !== "student") { cache[studentId] = null; continue; }
            cache[studentId] = {
              name: sd.anonymousEnabled && sd.anonymousId ? sd.anonymousId : sd.fullName || "Student",
              realName: sd.fullName || "",
            };
          } catch { cache[studentId] = null; continue; }
        }

        const student = cache[studentId];
        if (!student) continue;

        const canonicalChatId = [profile.uid, studentId].sort().join("_");
        let lastMsg: string | undefined = data.lastMessage || undefined;
        let lastMsgTime: Date | undefined = data.lastMessageTime?.toDate?.() ?? undefined;
        let lastMsgSender: string | undefined = data.lastMessageSender || undefined;
        try {
          const msgSnap = await getDocs(
            query(collection(db!, "directMessages", canonicalChatId, "messages"), orderBy("createdAt", "desc"), limit(1))
          );
          if (!msgSnap.empty) {
            const msgData = msgSnap.docs[0].data();
            lastMsg = msgData.text || lastMsg;
            lastMsgTime = msgData.createdAt?.toDate?.() ?? lastMsgTime;
            lastMsgSender = msgData.senderId || lastMsgSender;
          }
        } catch { /* fall back to parent doc */ }

        let canonicalData = data;
        if (convDoc.id !== canonicalChatId) {
          try {
            const canonSnap = await getDoc(doc(db!, "directMessages", canonicalChatId));
            if (canonSnap.exists()) canonicalData = canonSnap.data();
          } catch { /* use snapshot data as fallback */ }
        }

        let lastMessageRead = false;
        const studentLastRead = canonicalData[`lastRead_${studentId}`];
        if (lastMsgSender === profile.uid && studentLastRead?.toDate && lastMsgTime) {
          lastMessageRead = studentLastRead.toDate().getTime() >= lastMsgTime.getTime();
        }

        list.push({
          studentId,
          chatId: canonicalChatId,
          studentName: student.name,
          studentRealName: student.realName,
          lastMessage: lastMsg?.slice(0, 80),
          lastMessageTime: lastMsgTime,
          lastMessageSender: lastMsgSender,
          lastMessageRead,
          unreadCount: canonicalData[`unread_${profile.uid}`] || 0,
          status: canonicalData.conversationStatus || "active",
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
    }, (error) => {
      console.error("Inbox listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [profile]);

  const filtered = useMemo(() => {
    let list = conversations;

    if (activeTab === "unread") list = list.filter((c) => c.unreadCount > 0);
    else if (activeTab === "follow-up") list = list.filter((c) => c.status === "follow-up");
    else if (activeTab === "resolved") list = list.filter((c) => c.status === "resolved");
    else list = list.filter((c) => c.status !== "resolved" && c.status !== "archived");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        c.studentName.toLowerCase().includes(q) ||
        c.studentRealName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, activeTab, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: conversations.filter((c) => c.status !== "resolved" && c.status !== "archived").length,
    unread: conversations.filter((c) => c.unreadCount > 0).length,
    "follow-up": conversations.filter((c) => c.status === "follow-up").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
  }), [conversations]);

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + c.unreadCount, 0), [conversations]);

  const updateConversationStatus = async (chatId: string, status: string) => {
    if (!db) return;
    setStatusUpdating(chatId);
    try {
      await updateDoc(doc(db, "directMessages", chatId), { conversationStatus: status });
      setConversations((prev) => prev.map((c) => c.chatId === chatId ? { ...c, status: status as Conversation["status"] } : c));
    } catch (e) {
      console.error("Error updating status:", e);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    // On mobile, navigate to the full-page chat
    if (window.innerWidth < 1024) {
      router.push(`/counselor/inbox/${conv.studentId}`);
      return;
    }
    setSelectedId(conv.studentId);
    // Mark as read optimistically
    if (conv.unreadCount > 0 && db && profile) {
      setConversations((prev) => prev.map((c) => c.studentId === conv.studentId ? { ...c, unreadCount: 0 } : c));
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "follow-up", label: "Follow-up" },
    { id: "resolved", label: "Resolved" },
  ];

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inbox</h1>
              {totalUnread > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0F4F47] px-1.5 text-[11px] font-bold text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {loading ? "Loading..." : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Filter chips */}
          <div className="shrink-0 px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id];
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
                          : tab.id === "unread" ? "bg-[#0F4F47] text-white" :
                            tab.id === "follow-up" ? "bg-amber-500 text-white" :
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

          {/* Search — hidden when no conversations */}
          {conversations.length > 0 && (
            <div className="shrink-0 px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#2BB5A0] focus:bg-white dark:focus:bg-gray-950 focus:outline-none transition-colors" />
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 px-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-lg bg-gray-50 dark:bg-gray-900" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                {conversations.length === 0 ? (
                  <>
                    <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                    <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                      Make sure your profile is complete and availability is set so students can find and book you.
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <button onClick={() => router.push("/counselor/settings")}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0F4F47] px-4 py-2 text-xs font-bold text-white hover:bg-[#1A7A6E]">
                        <Settings className="h-3.5 w-3.5" /> Complete Profile
                      </button>
                      <button onClick={() => router.push("/counselor/availability")}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#0F4F47]/20 px-4 py-2 text-xs font-bold text-[#0F4F47] hover:bg-[#0F4F47]/5">
                        <Calendar className="h-3.5 w-3.5" /> Set Availability
                      </button>
                    </div>
                  </>
                ) : searchQuery ? (
                  <p className="text-sm text-gray-500">No conversations match &ldquo;{searchQuery}&rdquo;</p>
                ) : (
                  <p className="text-sm text-gray-500">No {activeTab === "unread" ? "unread" : activeTab === "follow-up" ? "follow-up" : "resolved"} conversations</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filtered.map((conv) => {
                  const isSelected = selectedId === conv.studentId;
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <button key={conv.studentId}
                      onClick={() => handleSelectConversation(conv)}
                      className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-[#2BB5A0]/8"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}>
                      {/* Avatar */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                        conv.status === "follow-up" ? "bg-amber-500" : "bg-[#0F4F47]"
                      }`}>
                        {getInitials(conv.studentName)}
                      </div>

                      {/* Name + message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-[14px] ${hasUnread ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-800 dark:text-gray-200"}`}>
                            {conv.studentName}
                          </span>
                          <span className={`shrink-0 text-[11px] ${hasUnread ? "font-semibold text-[#2BB5A0]" : "text-gray-400"}`}>
                            {formatTimestamp(conv.lastMessageTime)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {conv.lastMessage && (
                              <span className={`flex items-center gap-1 ${hasUnread ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                                {conv.lastMessageSender === profile?.uid && (
                                  conv.lastMessageRead
                                    ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-[#2BB5A0]" />
                                    : <Check className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                )}
                                <span className="text-[13px] truncate">{conv.lastMessage}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {conv.status === "follow-up" && (
                              <Flag className="h-3 w-3 text-amber-500 fill-amber-500" />
                            )}
                            {hasUnread && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2BB5A0] px-1 text-[10px] font-bold text-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat (desktop only) */}
        <div className={`flex-1 ${selectedId ? "flex" : "hidden lg:flex"} flex-col`}>
          {selectedId ? (
            <CounselorChatPanel
              studentId={selectedId}
              onBack={() => setSelectedId(null)}
              embedded
              convStatus={conversations.find((c) => c.studentId === selectedId)?.status}
              onStatusChange={(status) => {
                const conv = conversations.find((c) => c.studentId === selectedId);
                if (conv) updateConversationStatus(conv.chatId, status);
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center px-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <MessageCircle className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                <p className="mt-1 text-xs text-gray-400">Choose a student from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
