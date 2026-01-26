"use client";

import { AdminAuthProvider } from "@/context/adminAuth";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
