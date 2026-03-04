"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Simple light ↔ dark toggle.
 * Mounted guard prevents hydration mismatch since theme is unknown on the server.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-9 rounded-lg", className)} />
    );
  }

  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-colors",
        className
      )}
      title={`Theme: ${isDark ? "Dark" : "Light"}`}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
