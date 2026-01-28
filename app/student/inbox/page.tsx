"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Search, MessageCircle, Clock, Mail } from "lucide-react";
import { collection, getDocs, query, orderBy, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  type: "counselor" | "peer-mentor";
  avatar?: string;
  otherUserId?: string; // Store the other user's ID for navigation
}

export default function StudentInboxPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !db) {
      setLoading(false);
      return;
    }

    const conversationsList: Conversation[] = [];

    // Set up real-time listener on directMessages collection
    const unsub = onSnapshot(collection(db, "directMessages"), async (snap) => {
      conversationsList.length = 0;

      for (const convDoc of snap.docs) {
        const chatId = convDoc.id;
        const data = convDoc.data();
        const participants = data.participants as string[] | undefined;

        // Check if this conversation involves the student
        if (participants && Array.isArray(participants) && participants.includes(profile.uid) && db) {
          const otherUserId = participants.find(p => p !== profile.uid);

          if (otherUserId) {
            try {
              const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
              if (otherUserDoc.exists()) {
                const otherUserData = otherUserDoc.data();

                // Only show counselors and peer mentors
                if (otherUserData.role === "counselor" || otherUserData.role === "peer-mentor") {
                  // Use chatId as the unique identifier to avoid duplicates
                  const existingIndex = conversationsList.findIndex(c => c.id === chatId);
                  if (existingIndex === -1) {
                    conversationsList.push({
                      id: chatId, // Use chatId instead of otherUserId for uniqueness
                      name: otherUserData.fullName || "Unknown",
                      lastMessage: data.lastMessage?.slice(0, 80) || "No messages yet",
                      lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
                      type: otherUserData.role === "counselor" ? "counselor" : "peer-mentor",
                      avatar: otherUserData.avatar || otherUserData.profilePicture || undefined,
                      otherUserId: otherUserId, // Store for navigation
                    });
                  } else {
                    // Update existing conversation if this one is more recent
                    const existing = conversationsList[existingIndex];
                    const newTime = data.lastMessageTime?.toDate() || new Date();
                    if (newTime > existing.lastMessageTime) {
                      conversationsList[existingIndex] = {
                        ...existing,
                        lastMessage: data.lastMessage?.slice(0, 80) || "No messages yet",
                        lastMessageTime: newTime,
                      };
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Error fetching user data for conversation:", e);
            }
          }
        }
      }

      // Sort by last message time
      conversationsList.sort((a, b) => {
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setConversations(conversationsList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading conversations:", error);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [profile]);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">My Inbox</h1>
              <p className="mt-2 text-gray-400">All your conversations with counselors and peer mentors</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Conversations */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                <MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <p className="text-gray-400">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? "Try a different search term" : "Start chatting with a counselor or peer mentor to see messages here"}
                </p>
                {!searchQuery && (
                  <div className="mt-6 flex gap-4 justify-center">
                    <button
                      onClick={() => router.push("/student/counselors")}
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-sm font-medium text-white transition-all hover:from-blue-400 hover:to-indigo-500"
                    >
                      Find a Counselor
                    </button>
                    <button
                      onClick={() => router.push("/student/peer-mentors")}
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2 text-sm font-medium text-white transition-all hover:from-emerald-400 hover:to-teal-500"
                    >
                      Find a Peer Mentor
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => router.push(
                      conv.type === "counselor" 
                        ? `/student/counselors/${conv.otherUserId || conv.id}`
                        : `/student/peer-mentors/${conv.otherUserId || conv.id}`
                    )}
                    className="group w-full rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-emerald-500/30 hover:bg-white/10 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.avatar ? (
                          <img
                            src={conv.avatar}
                            alt={conv.name}
                            className="h-14 w-14 rounded-full object-cover border-2 border-white/20"
                          />
                        ) : (
                          <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${
                            conv.type === "counselor" 
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                              : "bg-gradient-to-br from-emerald-500 to-teal-600"
                          }`}>
                            {conv.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        {/* Online indicator */}
                        <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-gray-900 ${
                          conv.type === "counselor" ? "bg-blue-400" : "bg-emerald-400"
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white truncate">{conv.name}</h3>
                          {conv.lastMessageTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0 ml-2">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(conv.lastMessageTime)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            conv.type === "counselor"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {conv.type === "counselor" ? "Counselor" : "Peer Mentor"}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="line-clamp-2 text-sm text-gray-400">{conv.lastMessage}</p>
                        )}
                      </div>

                      {/* Arrow */}
                      <Mail className="h-5 w-5 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-emerald-400 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
