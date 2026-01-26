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
    <div className={cn("relative min-h-screen", className)}>
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
        "relative overflow-hidden rounded-3xl border border-white/30 bg-white/80 shadow-xl shadow-gray-200/60 backdrop-blur-md",
        "tk-shimmer",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-white/40" />
      <div className="relative">{children}</div>
    </div>
  );
}

