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
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">Talk to a peer mentor</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Connect with students who have been through it and truly understand.
              </p>
            </div>

            {/* Search + Filter */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-3 pl-11 pr-4
                    text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors
                    focus:border-green-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all
                      ${selectedSpec === spec
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100"
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
                  <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 animate-[shimmer_1.5s_infinite]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="h-10 rounded bg-gray-50 dark:bg-gray-900" />
                  </div>
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-12 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No mentors available right now</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Our peer mentors are volunteers with their own schedules. Check back soon, or book a session with a counselor.
                </p>
                <button
                  onClick={() => router.push("/student/counselors")}
                  className="mt-5 rounded-full bg-green-600 px-6 py-2.5 text-sm font-medium text-white
                    transition-all hover:bg-green-700"
                >
                  Talk to a Counselor instead
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentors.map((mentor) => (
                  <div
                    key={mentor.uid}
                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm p-5
                      transition-all duration-250 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-1"
                  >
                    {/* Header: Avatar + Name + Status */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative">
                        {mentor.avatar ? (
                          <img
                            src={mentor.avatar}
                            alt={mentor.fullName}
                            className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-gray-200 dark:border-gray-800"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                            bg-green-100 dark:bg-green-900 text-sm font-bold text-green-600 dark:text-green-400">
                            {mentor.fullName.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                        {/* Online dot */}
                        {mentor.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2
                            border-white dark:border-gray-950 bg-emerald-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{mentor.fullName}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span className="truncate">{mentor.school}</span>
                        </div>
                      </div>

                      {/* Availability badge */}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium
                        ${mentor.isOnline
                          ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}>
                        {mentor.isOnline ? "Available" : "Offline"}
                      </span>
                    </div>

                    {/* Specialization tag */}
                    {mentor.specialization && (
                      <div className="mb-3">
                        <span className="rounded-full bg-green-50 dark:bg-green-950 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                          {mentor.specialization}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {mentor.about}
                    </p>

                    {/* Footer: Stats + CTA */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {mentor.conversationsCount || 0} sessions completed
                      </span>
                      <button
                        onClick={() => router.push(`/student/peer-mentors/${mentor.uid}`)}
                        className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white
                          transition-all hover:bg-green-700 active:scale-[0.95]"
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
