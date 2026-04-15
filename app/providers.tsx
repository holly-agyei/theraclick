"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth";
import { CallProvider } from "@/context/callContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <CallProvider>
          {children}
          <PWAInstallPrompt />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

