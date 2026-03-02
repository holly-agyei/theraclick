"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Flag, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Report {
  id: string;
  userId: string;
  userRole: string;
  userName: string;
  issueType: string;
  description: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: Date;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved">("all");

  useEffect(() => {
    async function load() {
      if (!db) { setLoading(false); return; }
      try {
        const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
        setReports(snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        } as Report)));
      } catch (e) {
        console.error("Error loading reports:", e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const updateStatus = async (reportId: string, status: Report["status"]) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "reports", reportId), { status });
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status } : r));
    } catch (e) {
      console.error("Error updating report:", e);
    }
  };

  const filtered = reports.filter((r) => filter === "all" || r.status === filter);

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "reviewed") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Reports</h1>
          <p className="mt-2 text-gray-500">Issues and feedback reported by users</p>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(["all", "pending", "reviewed", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all
                ${filter === f
                  ? "bg-green-100 text-green-600 border border-green-500/30"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
                }`}
            >
              {f} {f !== "all" && `(${reports.filter((r) => r.status === f).length})`}
              {f === "all" && ` (${reports.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Flag className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {statusIcon(report.status)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {report.issueType}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 capitalize">
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                    <p className="text-xs text-gray-500">
                      {report.userName} ({report.userRole}) &middot;{" "}
                      {report.createdAt.toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {report.status === "pending" && (
                      <button
                        onClick={() => updateStatus(report.id, "reviewed")}
                        className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-600
                          hover:bg-amber-200"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {report.status !== "resolved" && (
                      <button
                        onClick={() => updateStatus(report.id, "resolved")}
                        className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-600
                          hover:bg-green-200"
                      >
                        Resolve
                      </button>
                    )}
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
