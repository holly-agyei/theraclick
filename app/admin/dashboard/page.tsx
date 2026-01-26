"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const [pendingSnap, approvedSnap, rejectedSnap, totalSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("status", "==", "pending"))),
          getDocs(query(collection(db, "users"), where("status", "==", "active"))),
          getDocs(query(collection(db, "users"), where("status", "==", "disabled"))),
          getDocs(collection(db, "users")),
        ]);

        setStats({
          pending: pendingSnap.size,
          approved: approvedSnap.size,
          rejected: rejectedSnap.size,
          total: totalSnap.size,
        });
      } catch (e) {
        console.error("Error loading stats:", e);
      } finally {
        setLoading(false);
      }
    }
    void loadStats();
  }, []);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-gray-400">Overview of user applications and approvals</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.pending}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/20 p-3">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Approved</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.approved}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/20 p-3">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Rejected</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.rejected}</p>
                  </div>
                  <div className="rounded-xl bg-red-500/20 p-3">
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Users</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/20 p-3">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/admin/pending"
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-blue-500/30 hover:bg-white/10"
            >
              <Clock className="mb-3 h-8 w-8 text-amber-400" />
              <h3 className="font-semibold text-white">Review Pending</h3>
              <p className="mt-1 text-sm text-gray-400">Approve or reject applications</p>
            </a>

            <a
              href="/admin/approved"
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-emerald-500/30 hover:bg-white/10"
            >
              <CheckCircle className="mb-3 h-8 w-8 text-emerald-400" />
              <h3 className="font-semibold text-white">View Approved</h3>
              <p className="mt-1 text-sm text-gray-400">See all active counselors & mentors</p>
            </a>

            <a
              href="/admin/rejected"
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-red-500/30 hover:bg-white/10"
            >
              <XCircle className="mb-3 h-8 w-8 text-red-400" />
              <h3 className="font-semibold text-white">Rejected Users</h3>
              <p className="mt-1 text-sm text-gray-400">View rejected applications</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
