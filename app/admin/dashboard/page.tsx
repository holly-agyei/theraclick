"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Users, CheckCircle, XCircle, Clock, Calendar, ChevronRight } from "lucide-react";
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

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

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
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of user applications and approvals
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
            <Calendar className="h-3.5 w-3.5" />
            {todayFormatted}
          </span>
        </div>

        {/* Stats Row */}
        {loading ? (
          <div className="mb-8 h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div className="mb-8 rounded-xl border border-gray-200 bg-white">
            <div className="grid grid-cols-2 divide-x divide-gray-200 md:grid-cols-4">
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Pending
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Approved
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.approved}</p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Rejected
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Total Users
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href="/admin/pending"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50"
            >
              <Clock className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Review Pending</p>
                <p className="text-xs text-gray-500">Approve or reject applications</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
            </a>
            <a
              href="/admin/approved"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50"
            >
              <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">View Approved</p>
                <p className="text-xs text-gray-500">Active counselors and mentors</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
            </a>
            <a
              href="/admin/rejected"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50"
            >
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Rejected Users</p>
                <p className="text-xs text-gray-500">View rejected applications</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300" />
            </a>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
