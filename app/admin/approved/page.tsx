"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, User, Mail, GraduationCap, Filter } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ApprovedUser {
  uid: string;
  fullName?: string;
  email?: string;
  role?: string;
  specialization?: string;
  about?: string;
  school?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function ApprovedUsersPage() {
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "peer-mentor" | "counselor">("all");

  useEffect(() => {
    async function loadApproved() {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        let q = query(collection(db, "users"), where("status", "==", "active"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        const list: ApprovedUser[] = snap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
          updatedAt: d.data().updatedAt?.toDate(),
        })) as ApprovedUser[];
        setUsers(list);
      } catch (e) {
        console.error("Error loading approved:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadApproved();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Approved Users</h1>
          <p className="mt-2 text-gray-400">All active counselors and peer mentors</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-white/10 bg-white/5 pl-12 text-white placeholder-gray-500 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            {(["all", "peer-mentor", "counselor"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  roleFilter === role
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {role === "all" ? "All" : role === "peer-mentor" ? "Peer Mentors" : "Counselors"}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-gray-400">No approved users found.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                    {user.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{user.fullName || "—"}</h3>
                    <p className="text-sm text-emerald-400 capitalize">{user.role?.replace("-", " ")}</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  )}
                  {user.specialization && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="truncate">{user.specialization}</span>
                    </div>
                  )}
                  {user.school && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span className="truncate">{user.school}</span>
                    </div>
                  )}
                </div>

                {user.updatedAt && (
                  <p className="mt-3 text-xs text-gray-500">
                    Approved: {user.updatedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
