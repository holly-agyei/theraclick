"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { 
  Search, 
  MessageCircle, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Filter,
  Clock
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Counselor {
  uid: string;
  fullName: string;
  specialization?: string;
  about?: string;
  avatar?: string | null;
  sessionsCompleted?: number;
  availability?: string[];
  isOnline?: boolean;
}

// Demo counselors for when Firebase is empty
const demoCounselors: Counselor[] = [
  {
    uid: "demo-1",
    fullName: "Dr. Akosua Mensah",
    specialization: "Anxiety & Stress Management",
    about: "Specializing in helping students manage academic stress and anxiety. 8+ years experience.",
    sessionsCompleted: 342,
    isOnline: true,
    availability: ["Mon 9-5", "Wed 9-5", "Fri 9-12"],
  },
  {
    uid: "demo-2",
    fullName: "Dr. Kwame Asante",
    specialization: "Depression & Mood Disorders",
    about: "Passionate about supporting young people through difficult times. Trauma-informed approach.",
    sessionsCompleted: 256,
    isOnline: false,
    availability: ["Tue 10-6", "Thu 10-6"],
  },
  {
    uid: "demo-3",
    fullName: "Dr. Ama Boateng",
    specialization: "Relationships & Family",
    about: "Expert in relationship counseling and family dynamics. Creating safe spaces for growth.",
    sessionsCompleted: 189,
    isOnline: true,
    availability: ["Mon 2-8", "Wed 2-8", "Sat 10-2"],
  },
  {
    uid: "demo-4",
    fullName: "Dr. Kofi Adjei",
    specialization: "Academic Performance",
    about: "Helping students overcome procrastination and build healthy study habits.",
    sessionsCompleted: 421,
    isOnline: false,
    availability: [],
  },
];

const specializations = [
  "All",
  "Anxiety & Stress",
  "Depression",
  "Relationships",
  "Academic",
  "Career",
];

export default function CounselorsPage() {
  const router = useRouter();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");

  useEffect(() => {
    async function loadCounselors() {
      try {
        if (db) {
          const q = query(
            collection(db, "users"),
            where("role", "==", "counselor"),
            where("status", "==", "active")
          );
          const snap = await getDocs(q);
          const list: Counselor[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              fullName: data.fullName,
              specialization: data.application?.specialization || data.specialization,
              about: data.application?.about || data.about,
              sessionsCompleted: data.sessionsCompleted || 0,
              isOnline: data.isOnline || false,
              avatar: data.avatar || data.profilePicture || null,
            } as Counselor;
          });
          
          if (list.length > 0) {
            setCounselors(list);
          } else {
            setCounselors(demoCounselors);
          }
        } else {
          setCounselors(demoCounselors);
        }
      } catch (e) {
        console.error("Error loading counselors:", e);
        setCounselors(demoCounselors);
      } finally {
        setLoading(false);
      }
    }
    void loadCounselors();
  }, []);

  const filteredCounselors = counselors.filter((c) => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = 
      selectedSpec === "All" || 
      c.specialization?.toLowerCase().includes(selectedSpec.toLowerCase());
    return matchesSearch && matchesSpec;
  });

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-white">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Professional Support</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Talk to a Counselor</h1>
              <p className="mt-2 text-gray-500">
                Connect with licensed professionals who understand what you're going through.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search counselors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 transition-colors focus:border-green-500 focus:outline-none"
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
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Counselors Grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-32 rounded bg-gray-100" />
                        <div className="h-4 w-48 rounded bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCounselors.map((counselor) => (
                  <button
                    key={counselor.uid}
                    onClick={() => router.push(`/student/counselors/${counselor.uid}`)}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm p-5 text-left transition-all hover:border-green-300 hover:shadow-md"
                  >
                    {/* Online indicator */}
                    {counselor.isOnline && (
                      <div className="absolute right-4 top-4 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                        <span className="text-xs text-green-500">Online</span>
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {counselor.avatar ? (
                          <img
                            src={counselor.avatar}
                            alt={counselor.fullName}
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white">
                            {counselor.fullName.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{counselor.fullName}</h3>
                        <p className="text-sm text-green-600">{counselor.specialization}</p>
                        
                        {/* Stats */}
                        {counselor.sessionsCompleted && (
                          <div className="mt-2 text-sm text-gray-500">
                            <span>{counselor.sessionsCompleted} sessions</span>
                          </div>
                        )}

                        {/* Availability */}
                        <div className="mt-3 flex items-center gap-2">
                          {counselor.availability && counselor.availability.length > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {counselor.availability[0]}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500">No times added yet</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="mt-6 h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-gray-900" />
                    </div>

                    {/* Quick actions */}
                    <div className="mt-4 flex gap-2">
                      <span className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">
                        <Calendar className="h-3.5 w-3.5" />
                        Book Session
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && filteredCounselors.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-gray-500">No counselors found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
