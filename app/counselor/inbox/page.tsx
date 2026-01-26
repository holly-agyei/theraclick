"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Search, MessageCircle, Clock } from "lucide-react";
import { collection, getDocs, query, orderBy, limit, doc, getDoc, onSnapshot, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  school?: string;
}

export default function CounselorInboxPage() {
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

    // Set up real-time listener on directMessages collection
    const unsub = onSnapshot(collection(db, "directMessages"), async (snap) => {
      const conversationsList: Conversation[] = [];
      const seenStudentIds = new Set<string>();

      for (const convDoc of snap.docs) {
        const chatId = convDoc.id;
        const data = convDoc.data();
        const participants = data.participants as string[] || [];

        // Check if this conversation involves the counselor
        if (participants.includes(profile.uid)) {
          // Find the student ID (the other participant)
          const studentId = participants.find(p => p !== profile.uid);
          
          if (studentId && !seenStudentIds.has(studentId)) {
            seenStudentIds.add(studentId);
            
            // Fetch student data
            if (!db) continue;
            try {
              const studentDoc = await getDoc(doc(db, "users", studentId));
              if (studentDoc.exists()) {
                const studentData = studentDoc.data();
                
                // Only add if it's actually a student
                if (studentData.role === "student") {
                  conversationsList.push({
                    studentId,
                    studentName: studentData?.anonymousEnabled && studentData?.anonymousId 
                      ? studentData.anonymousId 
                      : studentData?.fullName || "Student",
                    lastMessage: data.lastMessage?.slice(0, 80),
                    lastMessageTime: data.lastMessageTime?.toDate(),
                    school: studentData?.student?.school || studentData?.school,
                  });
                }
              }
            } catch (e) {
              console.error("Error fetching student data:", e);
            }
          }
        }
      }

      // Sort by last message time
      conversationsList.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
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
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.school?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">My Inbox</h1>
              <p className="mt-2 text-gray-400">All your conversations with students</p>
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500/50 focus:outline-none"
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <p className="text-gray-400">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? "Try a different search term" : "Students will reach out to you here"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.studentId}
                    onClick={() => router.push(`/counselor/inbox/${conv.studentId}`)}
                    className="group w-full rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-blue-500/30 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                        {conv.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white truncate">{conv.studentName}</h3>
                          {conv.lastMessageTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(conv.lastMessageTime)}</span>
                            </div>
                          )}
                        </div>
                        {conv.school && (
                          <p className="text-xs text-gray-500 mb-1">{conv.school}</p>
                        )}
                        {conv.lastMessage && (
                          <p className="line-clamp-2 text-sm text-gray-400">{conv.lastMessage}</p>
                        )}
                      </div>
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
