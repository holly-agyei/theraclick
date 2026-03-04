"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";

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
    <div className="flex h-dvh flex-col bg-white dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="relative mx-auto mb-5 h-14 w-14">
                <div className="absolute inset-0 rounded-full border-2 border-green-200 dark:border-green-800" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-green-600"
                  style={{ animationDuration: "1s" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image src="/images/theraklick-logo.png" alt="Theraklick" width={24} height={24} className="object-contain" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Preparing your safe space...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Setting up your session.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      <BottomNav />

      {/* Globe watermark — bottom-right corner accent */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 hidden opacity-[0.20] dark:opacity-[0.30] md:block">
        <InteractiveGlobe
          size={240}
          dotColor="rgba(22, 163, 74, ALPHA)"
          arcColor="rgba(22, 163, 74, 0.4)"
          markerColor="rgba(34, 197, 94, 0.8)"
          autoRotateSpeed={0.003}
        />
      </div>
    </div>
  );
}
