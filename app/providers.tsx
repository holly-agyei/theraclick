"use client";

import React from "react";
import { AuthProvider } from "@/context/auth";
import { CallProvider } from "@/context/callContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CallProvider>{children}</CallProvider>
    </AuthProvider>
  );
}

