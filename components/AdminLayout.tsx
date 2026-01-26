"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAdminAuth } from "@/context/adminAuth";
import { Shield, Users, CheckCircle, XCircle, BarChart3, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout, isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
    { href: "/admin/pending", icon: Users, label: "Pending Applications" },
    { href: "/admin/approved", icon: CheckCircle, label: "Approved Users" },
    { href: "/admin/rejected", icon: XCircle, label: "Rejected Users" },
  ];

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-gray-900 transition-transform md:relative md:translate-x-0`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-white">Admin Panel</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="font-medium text-white">{admin?.username}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/10 bg-gray-900/80 px-4 backdrop-blur-xl md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-white">Admin</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
