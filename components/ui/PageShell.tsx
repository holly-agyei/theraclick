"use client";

import { cn } from "@/lib/utils";
import { AnimatedBackdrop } from "./AnimatedBackdrop";

export function PageShell({
  imageSrc,
  overlay,
  children,
  className,
}: {
  imageSrc?: string;
  overlay?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen bg-[#F0FDF4] dark:bg-gray-950", className)}>
      <AnimatedBackdrop imageSrc={imageSrc} overlay={overlay} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        {children}
      </div>
    </div>
  );
}

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md",
        className
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

