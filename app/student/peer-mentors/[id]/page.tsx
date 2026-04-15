"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MessageCircle, GraduationCap, Users, Shield, Heart,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PeerMentor {
  uid: string;
  fullName: string;
  specialization?: string;
  about?: string;
  school?: string;
  conversationsCount?: number;
  isOnline?: boolean;
  avatar?: string | null;
}

export default function PeerMentorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<PeerMentor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMentor() {
      try {
        if (db) {
          const docSnap = await getDoc(doc(db, "users", mentorId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMentor({
              uid: docSnap.id,
              fullName: data.fullName,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              school: data.student?.school || data.school,
              conversationsCount: data.conversationsCount || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as PeerMentor);
          }
        }
      } catch (e) {
        console.error(e);
        setMentor(null);
      } finally {
        setLoading(false);
      }
    }
    void loadMentor();
  }, [mentorId]);

  const initials = mentor?.fullName?.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F4F47] border-t-transparent" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!mentor) {
    return (
      <LayoutWrapper>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <p>Peer mentor not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go back</Button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-2xl">

            {/* Back */}
            <button onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to peer mentors
            </button>

            {/* Profile Card */}
            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {mentor.avatar ? (
                    <img src={mentor.avatar} alt={mentor.fullName} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F4F47] text-lg font-bold text-white">
                      {initials}
                    </div>
                  )}
                  {mentor.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-gray-950 bg-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{mentor.fullName}</h1>
                  {mentor.specialization && (
                    <p className="mt-0.5 text-[14px] text-[#2BB5A0] font-medium">{mentor.specialization}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                    {mentor.school && (
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {mentor.school}</span>
                    )}
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Peer Mentor</span>
                    {mentor.conversationsCount != null && mentor.conversationsCount > 0 && (
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {mentor.conversationsCount} chats</span>
                    )}
                    <span className={`flex items-center gap-1 ${mentor.isOnline ? "text-green-600" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${mentor.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                      {mentor.isOnline ? "Online now" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-5">
                <button onClick={() => router.push("/student/inbox")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4F47] px-4 py-3 text-[13px] font-bold text-white hover:bg-[#1A7A6E] transition-colors">
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
              </div>
            </div>

            {/* About */}
            {mentor.about && (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">About</h3>
                <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">{mentor.about}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
