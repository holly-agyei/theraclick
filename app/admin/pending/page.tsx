"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, User, Mail, GraduationCap, Filter } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/adminAuth";

interface PendingUser {
  uid: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  specialization?: string;
  about?: string;
  school?: string;
  educationLevel?: string;
  createdAt?: Date;
}

export default function PendingApplicationsPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "peer-mentor" | "counselor">("all");

  useEffect(() => {
    async function loadPending() {
      if (!admin) return;

      setLoading(true);
      try {
        const res = await fetch("/api/admin/pending", {
          headers: {
            Authorization: `Bearer ${admin.id}`,
          },
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to load");
        const list: PendingUser[] = (data.users || []).map((u: any) => ({
          ...u,
          createdAt: u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt),
        }));
        setUsers(list);
      } catch (e: any) {
        console.error("Error loading pending:", e);
        alert(e?.message || "Failed to load pending applications");
      } finally {
        setLoading(false);
      }
    }
    void loadPending();
  }, [admin]);

  const handleAction = async (uid: string, action: "approve" | "reject") => {
    if (!admin) return;

    try {
      const res = await fetch(`/api/admin/users/${uid}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${admin.id}`,
        },
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");

      // Remove from list
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (e: any) {
      alert(e?.message || "Failed to " + action);
    }
  };

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Pending Applications</h1>
          <p className="mt-2 text-gray-400">Review and approve or reject applications</p>
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
                    ? "bg-blue-500 text-white"
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
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-gray-400">No pending applications found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  {/* User Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                          {user.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{user.fullName || "—"}</h3>
                          <p className="text-sm text-gray-400 capitalize">{user.role?.replace("-", " ")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {user.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {user.specialization && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{user.specialization}</span>
                        </div>
                      )}
                      {user.school && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <GraduationCap className="h-4 w-4" />
                          <span>{user.school}</span>
                        </div>
                      )}
                    </div>

                    {user.about && (
                      <div className="rounded-lg bg-white/5 p-4">
                        <p className="text-sm text-gray-300">{user.about}</p>
                      </div>
                    )}

                    {user.createdAt && (
                      <p className="text-xs text-gray-500">
                        Applied: {user.createdAt.toLocaleDateString()} {user.createdAt.toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 lg:flex-col">
                    <Button
                      onClick={() => handleAction(user.uid, "reject")}
                      variant="outline"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 lg:flex-none"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAction(user.uid, "approve")}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 lg:flex-none"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
