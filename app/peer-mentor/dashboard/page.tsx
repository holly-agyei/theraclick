"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  MessageCircle,
  Users,
  MessageSquare,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { collection, query, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export default function PeerMentorDashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({ totalConversations: 0, activeChats: 0 });
  const [loading, setLoading] = useState(true);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    async function loadData() {
      if (!profile || !db) {
        setLoading(false);
        return;
      }

      try {
        const conversationsList: Conversation[] = [];
        const conversationsSnap = await getDocs(collection(db, "directMessages"));

        for (const convDoc of conversationsSnap.docs) {
          const chatId = convDoc.id;
          const [uid1, uid2] = chatId.split("_");

          if (uid1 === profile.uid || uid2 === profile.uid) {
            const studentId = uid1 === profile.uid ? uid2 : uid1;
            const studentDoc = await getDoc(doc(db, "users", studentId));
            const studentData = studentDoc.exists() ? studentDoc.data() : null;

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
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white">
        <div className="px-4 py-8 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back, {profile?.fullName?.split(" ")[0] || "there"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                <Calendar className="h-3.5 w-3.5" />
                {todayFormatted}
              </span>
            </div>

            {/* Stats Row */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white">
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Total Conversations
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loading ? "--" : stats.totalConversations}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Active This Week
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loading ? "--" : stats.activeChats}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Specialization
                  </p>
                  <p className="mt-2 truncate text-lg font-bold text-gray-900">
                    {profile?.application?.specialization || "General Support"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/student/forums")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <MessageSquare className="h-5 w-5 shrink-0 text-green-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">View Forums</p>
                    <p className="text-xs text-gray-500">Participate in community discussions</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
                </button>
                <button
                  onClick={() => router.push("/peer-mentor/inbox")}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <MessageCircle className="h-5 w-5 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">My Inbox</p>
                    <p className="text-xs text-gray-500">View all student conversations</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Recent Conversations Table */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent conversations</h2>
                <button
                  onClick={() => router.push("/peer-mentor/inbox")}
                  className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="mt-1 text-xs text-gray-400">Students will reach out to you here</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Name
                        </th>
                        <th className="hidden px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
                          Last Message
                        </th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conversations.slice(0, 5).map((conv) => (
                        <tr
                          key={conv.studentId}
                          onClick={() => router.push(`/peer-mentor/inbox/${conv.studentId}`)}
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
                                {conv.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </div>
                              <span className="font-medium text-gray-900">{conv.studentName}</span>
                            </div>
                          </td>
                          <td className="hidden max-w-[200px] truncate px-5 py-3.5 text-gray-500 sm:table-cell">
                            {conv.lastMessage || "No messages"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-gray-400">
                            {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
