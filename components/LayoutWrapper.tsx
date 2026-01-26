"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

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

    // Allow peer mentors to access forums, but redirect other non-students from student routes
    if (pathname.startsWith("/student")) {
      if (role === "student") {
        // Allow access
      } else if (role === "peer-mentor" && pathname === "/student/forums") {
        // Allow peer mentors to access forums
      } else {
        router.replace(`/${role}/dashboard`);
        return;
      }
    }
  }, [loading, profile?.role, profile?.status, pathname, router]);

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0 md:overflow-auto">
        <div className="min-h-screen w-full">
          {loading ? (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="text-sm font-medium text-white">Preparing your safe space…</p>
                <p className="mt-1 text-sm text-gray-500">
                  Setting up your session.
                </p>
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
