"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  MessageCircle,
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  Search,
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export default function PeerMentorDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({ totalConversations: 0, activeChats: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile || !db) {
        setLoading(false);
        return;
      }

      try {
        // Get all conversations where this mentor is involved
        const conversationsList: Conversation[] = [];
        const conversationsSnap = await getDocs(collection(db, "directMessages"));
        
        for (const convDoc of conversationsSnap.docs) {
          const chatId = convDoc.id;
          const [uid1, uid2] = chatId.split("_");
          
          // Check if this mentor is part of the conversation
          if (uid1 === profile.uid || uid2 === profile.uid) {
            const studentId = uid1 === profile.uid ? uid2 : uid1;
            
            // Get student info
            const studentDoc = await getDoc(doc(db, "users", studentId));
            const studentData = studentDoc.exists() ? studentDoc.data() : null;
            
            // Get last message
            const messagesRef = collection(db, "directMessages", chatId, "messages");
            const lastMsgSnap = await getDocs(query(messagesRef, orderBy("createdAt", "desc"), limit(1)));
            const lastMsg = lastMsgSnap.empty ? null : lastMsgSnap.docs[0].data();
            
            conversationsList.push({
              studentId,
              studentName: studentData?.anonymousEnabled && studentData?.anonymousId 
                ? studentData.anonymousId 
                : studentData?.fullName || "Student",
              lastMessage: lastMsg?.text?.slice(0, 50),
              lastMessageTime: lastMsg?.createdAt?.toDate(),
              unreadCount: 0, // Could implement read receipts later
            });
          }
        }

        conversationsList.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });

        setConversations(conversationsList);
        setStats({
          totalConversations: conversationsList.length,
          activeChats: conversationsList.filter(c => c.lastMessageTime && 
            Date.now() - c.lastMessageTime.getTime() < 7 * 24 * 60 * 60 * 1000).length,
        });
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [profile]);

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Ambient effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
          <div className="absolute -right-20 bottom-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Peer Mentor Dashboard</span>
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Welcome back, {profile?.fullName?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="mt-2 text-gray-400">
                Continue supporting students who need someone to talk to.
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Conversations</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.totalConversations}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/20 p-3">
                    <MessageCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active This Week</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.activeChats}</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/20 p-3">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Specialization</p>
                    <p className="mt-2 text-lg font-semibold text-white truncate">
                      {profile?.application?.specialization || "General Support"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-500/20 p-3">
                    <Users className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/student/forums")}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:bg-white/10"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
                  <div className="relative z-10">
                    <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mb-1 font-semibold text-white">View Forums</h3>
                    <p className="text-sm text-gray-400">Participate in community discussions</p>
                  </div>
                  <ChevronRight className="absolute bottom-5 right-5 h-5 w-5 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
                </button>

                <button
                  onClick={() => router.push("/peer-mentor/inbox")}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm transition-all hover:border-blue-500/30 hover:bg-white/10"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
                  <div className="relative z-10">
                    <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mb-1 font-semibold text-white">My Inbox</h3>
                    <p className="text-sm text-gray-400">View all student conversations</p>
                  </div>
                  <ChevronRight className="absolute bottom-5 right-5 h-5 w-5 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">This Week</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {conversations.filter(c => c.lastMessageTime && 
                        Date.now() - c.lastMessageTime.getTime() < 7 * 24 * 60 * 60 * 1000).length}
                    </p>
                    <p className="text-xs text-gray-500">Active conversations</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/20 p-3">
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Helped</p>
                    <p className="mt-2 text-2xl font-bold text-white">{stats.totalConversations}</p>
                    <p className="text-xs text-gray-500">Students supported</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/20 p-3">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Conversations */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Conversations</h2>
                <button
                  onClick={() => router.push("/peer-mentor/inbox")}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                  <p className="text-gray-400">No conversations yet</p>
                  <p className="mt-1 text-sm text-gray-500">Students will reach out to you here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 5).map((conv) => (
                    <button
                      key={conv.studentId}
                      onClick={() => router.push(`/peer-mentor/inbox/${conv.studentId}`)}
                      className="group w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                          {conv.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white truncate">{conv.studentName}</h3>
                            {conv.lastMessageTime && (
                              <span className="text-xs text-gray-500">{formatTime(conv.lastMessageTime)}</span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="mt-1 truncate text-sm text-gray-400">{conv.lastMessage}...</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
