"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Search, MessageCircle, Calendar, ChevronRight, Sparkles,
  Star, Clock, Shield,
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
  rating?: number;
  yearsExperience?: number;
}

const specializations = [
  "All",
  "Available Now",
  "Anxiety & Stress",
  "Depression",
  "Relationships",
  "Academic",
  "Career",
  "Self Esteem",
  "Grief & Loss",
  "Family Issues",
  "Trauma",
];

function getInitials(name: string): string {
  const parts = name.replace(/^Dr\.?\s*/i, "").split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function CounselorsPage() {
  const router = useRouter();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");

  useEffect(() => {
    let mounted = true;
    async function loadCounselors() {
      try {
        if (db) {
          const q = query(collection(db, "users"), where("role", "==", "counselor"));
          const snap = await getDocs(q);
          if (!mounted) return;
          const list: Counselor[] = snap.docs
            .filter((d) => d.data().status === "active")
            .map((d) => {
              const data = d.data();
              return {
                uid: d.id,
                fullName: data.fullName,
                specialization: data.application?.specialization || data.specialization,
                about: data.application?.about || data.about,
                sessionsCompleted: data.sessionsCompleted || 0,
                isOnline: data.isOnline || false,
                avatar: data.avatar || data.profilePicture || null,
                rating: data.rating || 0,
                yearsExperience: data.yearsExperience || 0,
              } as Counselor;
            });

          if (!mounted) return;
          setCounselors(list);
        } else {
          setCounselors([]);
        }
      } catch (e) {
        console.error("Error loading counselors:", e);
        if (!mounted) return;
        setCounselors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCounselors();
    return () => { mounted = false; };
  }, []);

  const filteredCounselors = counselors.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.about?.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesSpec = true;
    if (selectedSpec === "Available Now") {
      matchesSpec = !!c.isOnline;
    } else if (selectedSpec !== "All") {
      matchesSpec = !!c.specialization?.toLowerCase().includes(selectedSpec.toLowerCase());
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
                <Shield className="h-4 w-4 text-[#2BB5A0]" />
                <span className="text-[13px] font-semibold text-[#2BB5A0]">Verified Professionals</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Talk to a Counselor</h1>
              <p className="mt-1 text-[14px] text-gray-500 dark:text-gray-400">
                Connect with licensed professionals who understand what you&apos;re going through.
              </p>
            </div>

            {/* AI Match banner */}
            <button onClick={() => router.push("/student/chat")}
              className="group mb-6 flex w-full items-center gap-4 rounded-xl border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 p-4 text-left transition-all hover:border-[#2BB5A0]/40 hover:bg-[#2BB5A0]/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10">
                <Sparkles className="h-5 w-5 text-[#0F4F47]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Not sure who to choose?</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">Our AI can help match you with the right counselor based on what you&apos;re going through.</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-[#2BB5A0] transition-colors" />
            </button>

            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, specialization, or topic..."
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
                      : spec === "Available Now" ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {spec === "Available Now" && "🟢 "}{spec}
                </button>
              ))}
            </div>

            {/* Counselors Grid — portrait cards */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="mt-4 mx-auto h-4 w-32 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="mt-2 mx-auto h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : filteredCounselors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-12 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-[14px] text-gray-500 dark:text-gray-400">No counselors found matching your search.</p>
                <button onClick={() => { setSearchQuery(""); setSelectedSpec("All"); }}
                  className="mt-3 text-[13px] font-semibold text-[#2BB5A0] hover:underline">Clear filters</button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCounselors.map((c) => (
                  <div key={c.uid}
                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center transition-all hover:border-[#2BB5A0] hover:shadow-lg hover:shadow-[#0F4F47]/5">

                    {/* Avatar */}
                    <div className="relative mx-auto w-fit">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.fullName}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F4F47] text-[18px] font-bold text-white">
                          {getInitials(c.fullName)}
                        </div>
                      )}
                      {c.isOnline && (
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-400" />
                      )}
                    </div>

                    <h3 className="mt-4 text-[15px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#0F4F47]">{c.fullName}</h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#2BB5A0]">{c.specialization || "General Counseling"}</p>

                    <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-gray-500 dark:text-gray-400">
                      {(c.rating ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-[#F5C842] text-[#F5C842]" />
                          {c.rating?.toFixed(1)}
                        </span>
                      )}
                      {(c.sessionsCompleted ?? 0) > 0 && (
                        <span>{c.sessionsCompleted} sessions</span>
                      )}
                      {(c.yearsExperience ?? 0) > 0 && (
                        <span>{c.yearsExperience}yr exp</span>
                      )}
                    </div>

                    {c.about && (
                      <p className="mt-3 text-[12px] leading-[1.5] text-gray-500 dark:text-gray-400 line-clamp-2">{c.about}</p>
                    )}

                    <div className="mt-3">
                      {c.availability && c.availability.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <Clock className="h-3 w-3" /> {c.availability[0]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-400">
                          <Clock className="h-3 w-3" /> Check availability
                        </span>
                      )}
                    </div>

                    {/* Actions — separate clickable buttons */}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => router.push(`/student/inbox?chat=${c.uid}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F4F47]/5 py-2.5 text-[12px] font-semibold text-[#0F4F47] dark:text-[#2BB5A0] hover:bg-[#0F4F47]/10 transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </button>
                      <button onClick={() => router.push(`/student/counselors/${c.uid}`)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F4F47] py-2.5 text-[12px] font-bold text-white hover:bg-[#1A7A6E] transition-colors">
                        <Calendar className="h-3.5 w-3.5" /> Book
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
