"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Search, Users, MessageCircle, User, GraduationCap } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth";

interface Student {
  uid: string;
  fullName?: string;
  anonymousId?: string;
  anonymousEnabled?: boolean;
  school?: string;
  educationLevel?: string;
  email?: string;
}

export default function CounselorStudentsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const studentsSnap = await getDocs(collection(db, "users"));
        const studentsList: Student[] = studentsSnap.docs
          .filter((d) => d.data().role === "student")
          .map((d) => ({ uid: d.id, ...d.data() } as Student));
        
        studentsList.sort((a, b) => {
          const nameA = (a.anonymousEnabled && a.anonymousId ? a.anonymousId : a.fullName) || "";
          const nameB = (b.anonymousEnabled && b.anonymousId ? b.anonymousId : b.fullName) || "";
          return nameA.localeCompare(nameB);
        });
        
        setStudents(studentsList);
      } catch (e) {
        console.error("Error loading students:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const displayName = s.anonymousEnabled && s.anonymousId ? s.anonymousId : s.fullName || "";
    const searchLower = searchQuery.toLowerCase();
    return (
      displayName.toLowerCase().includes(searchLower) ||
      s.email?.toLowerCase().includes(searchLower) ||
      s.school?.toLowerCase().includes(searchLower) ||
      s.educationLevel?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">All Students</h1>
              <p className="mt-2 text-gray-400">View and manage all registered students</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, email, school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Students Grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <Users className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <p className="text-gray-400">
                  {searchQuery ? "No students found" : "No students registered yet"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.map((student) => {
                  const displayName = student.anonymousEnabled && student.anonymousId 
                    ? student.anonymousId 
                    : student.fullName || "Student";
                  
                  return (
                    <div
                      key={student.uid}
                      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-blue-500/30 hover:bg-white/10"
                      onClick={() => router.push(`/counselor/inbox/${student.uid}`)}
                    >
                      <div className="mb-4 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                          {displayName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate font-semibold text-white">{displayName}</h3>
                          {student.anonymousEnabled && (
                            <p className="text-xs text-emerald-400">Anonymous Mode</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {student.school && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <GraduationCap className="h-4 w-4" />
                            <span className="truncate">{student.school}</span>
                          </div>
                        )}
                        {student.educationLevel && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <User className="h-4 w-4" />
                            <span>{student.educationLevel}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/counselor/inbox/${student.uid}`);
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Open Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
