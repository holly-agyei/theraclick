"use client";

/**
 * LAYOUT WRAPPER — Shell for authenticated pages.
 *
 * Includes:
 * - Sidebar (desktop)
 * - Bottom nav (mobile)
 * - Auth guard with redirect
 * - Loading state with branded spinner
 */

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brain } from "lucide-react";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const role = profile?.role ?? null;
    if (!role) {
      router.replace("/login");
      return;
    }

    if (profile?.status === "pending") {
      router.replace("/pending-approval");
      return;
    }

    if (profile?.status === "disabled") {
      router.replace("/login");
      return;
    }

    // Allow peer mentors to access forums
    if (pathname.startsWith("/student")) {
      if (role === "student") {
        /* allow */
      } else if (role === "peer-mentor" && pathname === "/student/forums") {
        /* allow */
      } else {
        router.replace(`/${role}/dashboard`);
        return;
      }
    }
  }, [loading, profile?.role, profile?.status, pathname, router]);

  return (
    <div className="flex min-h-screen bg-[#0D1F1D]">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0 md:overflow-auto">
        <div className="min-h-screen w-full">
          {loading ? (
            /* ── Branded loading state ── */
            <div className="flex min-h-screen items-center justify-center bg-[#0D1F1D]">
              <div className="text-center">
                <div className="relative mx-auto mb-5 h-14 w-14">
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#2BB5A0]/20" />
                  <div className="absolute inset-0 animate-spin rounded-full
                    border-2 border-transparent border-t-[#2BB5A0]"
                    style={{ animationDuration: "1s" }} />
                  {/* Center brain icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-[#2BB5A0]" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-sm font-medium text-white">Preparing your safe space…</p>
                <p className="mt-1 text-xs text-[#6B8C89]">Setting up your session.</p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
