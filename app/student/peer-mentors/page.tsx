"use client";

/**
 * PEER MENTORS — Browse and connect with peer mentors.
 * Clean card layout with real structure: avatar, name, school, bio, stats, CTA.
 * Proper empty state when no mentors available.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Search,
  MessageCircle,
  GraduationCap,
  Calendar,
  Stethoscope,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
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

// Demo data — shown when no real mentors exist yet
const demoPeerMentors: PeerMentor[] = [
  {
    uid: "mentor-1",
    fullName: "Esi Owusu",
    specialization: "Academic Stress",
    about: "3rd year Psychology student. I have been through the struggle and I am here to help you navigate it.",
    school: "University of Ghana",
    conversationsCount: 89,
    isOnline: true,
  },
  {
    uid: "mentor-2",
    fullName: "Yaw Mensah",
    specialization: "First Year Transition",
    about: "Final year Engineering student. I know how overwhelming first year can be. Let me help.",
    school: "KNUST",
    conversationsCount: 156,
    isOnline: true,
  },
  {
    uid: "mentor-3",
    fullName: "Adwoa Asare",
    specialization: "Anxiety & Overthinking",
    about: "Medical student who has learned to manage anxiety. Happy to share what works.",
    school: "UCC",
    conversationsCount: 203,
    isOnline: false,
  },
  {
    uid: "mentor-4",
    fullName: "Kofi Darko",
    specialization: "Relationships & Social Life",
    about: "Sometimes you just need someone your age to talk to. I am here to listen.",
    school: "Ashesi University",
    conversationsCount: 67,
    isOnline: true,
  },
  {
    uid: "mentor-5",
    fullName: "Akua Boateng",
    specialization: "Study Tips & Motivation",
    about: "Dean's list student sharing practical study strategies that actually work.",
    school: "University of Ghana",
    conversationsCount: 142,
    isOnline: false,
  },
];

const specializations = [
  "All",
  "Academic Stress",
  "Anxiety",
  "Relationships",
  "First Year",
  "Study Tips",
];

export default function PeerMentorsPage() {
  const router = useRouter();
  const [mentors, setMentors] = useState<PeerMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");

  useEffect(() => {
    async function loadMentors() {
      try {
        if (db) {
          const q = query(
            collection(db, "users"),
            where("role", "==", "peer-mentor"),
            where("status", "==", "active")
          );
          const snap = await getDocs(q);
          const list: PeerMentor[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              fullName: data.fullName,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              school: data.student?.school || data.school,
              conversationsCount: data.conversationsCount || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as PeerMentor;
          });

          setMentors(list.length > 0 ? list : demoPeerMentors);
        } else {
          setMentors(demoPeerMentors);
        }
      } catch (e) {
        console.error("Error loading mentors:", e);
        setMentors(demoPeerMentors);
      } finally {
        setLoading(false);
      }
    }
    void loadMentors();
  }, []);

  const filteredMentors = mentors.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.school?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec =
      selectedSpec === "All" ||
      m.specialization?.toLowerCase().includes(selectedSpec.toLowerCase());
    return matchesSearch && matchesSpec;
  });

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-[#0D1F1D]">
        {/* Subtle ambient */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#2BB5A0]/8 blur-[120px]" />
          <div className="absolute -right-20 bottom-40 h-96 w-96 rounded-full bg-[#1A7A6E]/8 blur-[140px]" />
        </div>

        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white md:text-3xl">Talk to a peer mentor</h1>
              <p className="mt-2 text-sm text-[#6B8C89]">
                Connect with students who have been through it and truly understand.
              </p>
            </div>

            {/* Search + Filter */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8C89]" />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4
                    text-sm text-white placeholder-[#6B8C89] transition-colors
                    focus:border-[#2BB5A0]/50 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all
                      ${selectedSpec === spec
                        ? "border-[#2BB5A0] bg-[#2BB5A0] text-white"
                        : "border-white/[0.12] text-white/60 hover:border-white/20 hover:text-white"
                      }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Mentors Grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-white/[0.06] animate-[shimmer_1.5s_infinite]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 rounded bg-white/[0.06]" />
                        <div className="h-3 w-32 rounded bg-white/[0.06]" />
                      </div>
                    </div>
                    <div className="h-10 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-[#6B8C89]/40" />
                <h3 className="text-lg font-semibold text-white">No mentors available right now</h3>
                <p className="mt-2 text-sm text-[#6B8C89] max-w-sm mx-auto">
                  Our peer mentors are volunteers with their own schedules. Check back soon, or book a session with a counselor.
                </p>
                <button
                  onClick={() => router.push("/student/counselors")}
                  className="mt-5 rounded-full bg-[#2BB5A0] px-6 py-2.5 text-sm font-medium text-white
                    transition-all hover:bg-[#2BB5A0]/80"
                >
                  Talk to a Counselor instead
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentors.map((mentor) => (
                  <div
                    key={mentor.uid}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5
                      transition-all duration-250 hover:border-[#2BB5A0]/25 hover:-translate-y-1"
                  >
                    {/* Header: Avatar + Name + Status */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative">
                        {mentor.avatar ? (
                          <img
                            src={mentor.avatar}
                            alt={mentor.fullName}
                            className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-white/[0.12]"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                            bg-[#2BB5A0]/20 text-sm font-bold text-[#2BB5A0]">
                            {mentor.fullName.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                        {/* Online dot */}
                        {mentor.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2
                            border-[#0D1F1D] bg-emerald-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{mentor.fullName}</h3>
                        <div className="flex items-center gap-1 text-xs text-[#6B8C89] mt-0.5">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span className="truncate">{mentor.school}</span>
                        </div>
                      </div>

                      {/* Availability badge */}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium
                        ${mentor.isOnline
                          ? "bg-emerald-400/15 text-emerald-400"
                          : "bg-white/[0.06] text-[#6B8C89]"
                        }`}>
                        {mentor.isOnline ? "Available" : "Offline"}
                      </span>
                    </div>

                    {/* Specialization tag */}
                    {mentor.specialization && (
                      <div className="mb-3">
                        <span className="rounded-full bg-[#2BB5A0]/10 px-2.5 py-1 text-xs font-medium text-[#2BB5A0]">
                          {mentor.specialization}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    <p className="mb-4 line-clamp-2 text-sm text-gray-400 leading-relaxed">
                      {mentor.about}
                    </p>

                    {/* Footer: Stats + CTA */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B8C89]">
                        {mentor.conversationsCount || 0} sessions completed
                      </span>
                      <button
                        onClick={() => router.push(`/student/peer-mentors/${mentor.uid}`)}
                        className="rounded-full bg-[#2BB5A0] px-4 py-2 text-xs font-semibold text-white
                          transition-all hover:bg-[#2BB5A0]/80 active:scale-[0.95]"
                      >
                        Start Chat
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
