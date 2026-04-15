"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Search, MessageCircle, GraduationCap, ChevronRight, Heart,
  BadgeCheck, Clock, Users, Info,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface PeerMentor {
  uid: string;
  fullName: string;
  specialization?: string;
  about?: string;
  school?: string;
  level?: string;
  conversationsCount?: number;
  isOnline?: boolean;
  avatar?: string | null;
  topics?: string[];
  responseTime?: string;
}

const specializations = [
  "All",
  "Available Now",
  "Academic Stress",
  "Anxiety",
  "Relationships",
  "First Year",
  "Study Tips",
  "Family Pressure",
  "Same School",
];

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function PeerMentorsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [mentors, setMentors] = useState<PeerMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");

  const studentSchool = profile?.role === "student" ? (profile as Record<string, unknown>).school as string | undefined : undefined;

  useEffect(() => {
    let mounted = true;
    async function loadMentors() {
      try {
        if (db) {
          const q = query(collection(db, "users"), where("role", "==", "peer-mentor"));
          const snap = await getDocs(q);
          if (!mounted) return;
          const list: PeerMentor[] = snap.docs
            .filter((d) => d.data().status === "active")
            .map((d) => {
              const data = d.data();
              return {
                uid: d.id,
                fullName: data.fullName,
                specialization: data.application?.specialization || data.specialization,
                about: data.application?.about || data.about,
                school: data.student?.school || data.school,
                level: data.educationLevel,
                conversationsCount: data.conversationsCount || 0,
                isOnline: data.isOnline || false,
                avatar: data.avatar || data.profilePicture || null,
              } as PeerMentor;
            });
          if (!mounted) return;
          setMentors(list);
        } else {
          setMentors([]);
        }
      } catch (e) {
        console.error("Error loading mentors:", e);
        if (!mounted) return;
        setMentors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadMentors();
    return () => { mounted = false; };
  }, []);

  const filteredMentors = mentors.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.school?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.about?.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesSpec = true;
    if (selectedSpec === "Available Now") {
      matchesSpec = !!m.isOnline;
    } else if (selectedSpec === "Same School") {
      matchesSpec = !!studentSchool && !!m.school?.toLowerCase().includes(studentSchool.toLowerCase());
    } else if (selectedSpec !== "All") {
      matchesSpec = !!(
        m.specialization?.toLowerCase().includes(selectedSpec.toLowerCase()) ||
        m.topics?.some(t => t.toLowerCase().includes(selectedSpec.toLowerCase()))
      );
    }
    return matchesSearch && matchesSpec;
  });

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#2BB5A0]" />
                <span className="text-[13px] font-semibold text-[#2BB5A0]">Peer Support</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Talk to a Peer Mentor</h1>
              <p className="mt-1 text-[14px] text-gray-500 dark:text-gray-400">
                Connect with trained students who&apos;ve been through it and truly understand.
              </p>
            </div>

            {/* Explainer banner */}
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#2BB5A0]/15 bg-[#2BB5A0]/5 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0F4F47]" />
              <div>
                <p className="text-[13px] leading-[1.5] text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-900 dark:text-gray-100">Peer mentors are trained students</strong> who&apos;ve faced similar challenges. They offer friendly, relatable support — not clinical advice. All mentors are verified through our approval process.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, school, or topic..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-3 pl-11 pr-4 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
            </div>

            {/* Filter chips */}
            <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {specializations.map((spec) => (
                <button key={spec} onClick={() => setSelectedSpec(spec)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all
                    ${selectedSpec === spec
                      ? spec === "Available Now" ? "bg-emerald-600 text-white" : "bg-[#0F4F47] text-white"
                      : spec === "Available Now" ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                      : spec === "Same School" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {spec === "Available Now" && "🟢 "}{spec === "Same School" && "🎓 "}{spec}
                </button>
              ))}
            </div>

            {/* Mentors Grid */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="mt-4 mx-auto h-4 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="mt-2 mx-auto h-3 w-36 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
                <Users className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-[14px] text-gray-500 dark:text-gray-400">No mentors found matching your filters.</p>
                <button onClick={() => { setSearchQuery(""); setSelectedSpec("All"); }}
                  className="mt-3 text-[13px] font-semibold text-[#2BB5A0] hover:underline">Clear filters</button>
                <div className="mt-4">
                  <button onClick={() => router.push("/student/counselors")}
                    className="rounded-full bg-[#0F4F47] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1A7A6E]">
                    Talk to a Counselor instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMentors.map((m) => (
                  <div key={m.uid}
                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center transition-all hover:border-[#2BB5A0] hover:shadow-lg hover:shadow-[#0F4F47]/5">

                    {/* Avatar */}
                    <div className="relative mx-auto w-fit">
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.fullName}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2BB5A0]/15 text-[18px] font-bold text-[#0F4F47] dark:text-[#2BB5A0]">
                          {getInitials(m.fullName)}
                        </div>
                      )}
                      {m.isOnline && (
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-400" />
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#0F4F47]">{m.fullName}</h3>
                      <span className="inline-flex" title="Verified mentor">
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[#2BB5A0]" aria-hidden />
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.level || m.school}</span>
                    </div>
                    {m.level && m.school && (
                      <p className="mt-0.5 text-[11px] text-gray-400">{m.school}</p>
                    )}

                    <p className="mt-2 text-[13px] font-medium text-[#2BB5A0]">{m.specialization || "General Support"}</p>

                    {m.topics && m.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {m.topics.map((t) => (
                          <span key={t} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.about && (
                      <p className="mt-3 text-[12px] leading-[1.5] text-gray-500 dark:text-gray-400 line-clamp-2">{m.about}</p>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400">
                      {(m.conversationsCount ?? 0) > 0 && (
                        <span>{m.conversationsCount} chats</span>
                      )}
                      {(m.conversationsCount ?? 0) === 0 && (
                        <span className="rounded-full bg-[#F5C842]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B8940A]">New mentor</span>
                      )}
                      {m.responseTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {m.responseTime.replace("Usually replies within ", "~")}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => router.push(`/student/inbox?chat=${m.uid}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F4F47] py-2.5 text-[12px] font-bold text-white hover:bg-[#1A7A6E] transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </button>
                      <button onClick={() => router.push(`/student/peer-mentors/${m.uid}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F4F47]/5 py-2.5 text-[12px] font-semibold text-[#0F4F47] dark:text-[#2BB5A0] hover:bg-[#0F4F47]/10 transition-colors">
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
