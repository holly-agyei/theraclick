"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { 
  Search, 
  MessageCircle, 
  ChevronRight,
  Sparkles,
  Filter,
  GraduationCap,
  Heart
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

// Demo peer mentors
const demoPeerMentors: PeerMentor[] = [
  {
    uid: "mentor-1",
    fullName: "Esi Owusu",
    specialization: "Academic Stress",
    about: "3rd year Psychology student. Been through the struggle and here to help!",
    school: "University of Ghana",
    conversationsCount: 89,
    isOnline: true,
  },
  {
    uid: "mentor-2",
    fullName: "Yaw Mensah",
    specialization: "First Year Transition",
    about: "Final year Engineering student. I know how overwhelming first year can be.",
    school: "KNUST",
    conversationsCount: 156,
    isOnline: true,
  },
  {
    uid: "mentor-3",
    fullName: "Adwoa Asare",
    specialization: "Anxiety & Overthinking",
    about: "Medical student who's learned to manage anxiety. Happy to share what works!",
    school: "UCC",
    conversationsCount: 203,
    isOnline: false,
  },
  {
    uid: "mentor-4",
    fullName: "Kofi Darko",
    specialization: "Relationships & Social Life",
    about: "Sometimes you just need someone your age to talk to. I'm here to listen.",
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
          
          if (list.length > 0) {
            setMentors(list);
          } else {
            setMentors(demoPeerMentors);
          }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Ambient effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
          <div className="absolute -right-20 bottom-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Peer Support</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Talk to a Peer Mentor</h1>
              <p className="mt-2 text-gray-400">
                Connect with students who've been through it and truly understand.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Filter className="h-4 w-4 shrink-0 text-gray-500" />
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedSpec === spec
                        ? "bg-emerald-500 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
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
                  <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 rounded bg-white/10" />
                        <div className="h-3 w-32 rounded bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentors.map((mentor) => (
                  <button
                    key={mentor.uid}
                    onClick={() => router.push(`/student/peer-mentors/${mentor.uid}`)}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:bg-white/10"
                  >
                    {/* Online indicator */}
                    {mentor.isOnline && (
                      <div className="absolute right-4 top-4 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                        <span className="text-xs text-emerald-400">Online</span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {mentor.avatar ? (
                        <img
                          src={mentor.avatar}
                          alt={mentor.fullName}
                          className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                          {mentor.fullName.split(" ").map(n => n[0]).join("")}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">{mentor.fullName}</h3>
                        <p className="text-sm text-emerald-400">{mentor.specialization}</p>
                        
                        {/* School */}
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <GraduationCap className="h-3 w-3" />
                          <span className="truncate">{mentor.school}</span>
                        </div>
                      </div>
                    </div>

                    {/* About */}
                    <p className="mt-3 line-clamp-2 text-sm text-gray-400">
                      {mentor.about}
                    </p>

                      {/* Stats & Action */}
                      <div className="mt-4 flex items-center justify-between">
                        {mentor.conversationsCount && (
                          <div className="text-sm text-gray-500">
                            <span>{mentor.conversationsCount} chats</span>
                          </div>
                        )}

                      <div className="flex items-center gap-1 text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">Chat</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && filteredMentors.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <p className="text-gray-400">No peer mentors found matching your search.</p>
              </div>
            )}

            {/* Info card */}
            <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5">
              <div className="flex items-start gap-4">
                <Sparkles className="mt-0.5 h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-white">Why peer support?</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Sometimes it helps to talk to someone who's been through the same experiences. 
                    Peer mentors are trained students who understand what you're going through.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
