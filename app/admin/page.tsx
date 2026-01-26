"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminAuth } from "@/context/adminAuth";

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/admin/login");
      }
    }
  }, [loading, isAuthenticated, router]);

  return null;
}
