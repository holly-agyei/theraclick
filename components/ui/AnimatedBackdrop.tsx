"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function AnimatedBackdrop({
  imageSrc,
  overlay = "bg-white/85",
  className,
}: {
  imageSrc?: string;
  overlay?: string;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0 -z-10 overflow-hidden", className)}>
      {imageSrc ? (
        <>
          <Image
            src={imageSrc}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className={cn("absolute inset-0", overlay)} />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/40 via-white to-white" />
      )}

      {/* Animated orbs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-200/45 blur-3xl tk-float" />
      <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl tk-float2" />
      <div className="pointer-events-none absolute left-1/3 -bottom-28 h-[28rem] w-[28rem] rounded-full bg-lime-200/30 blur-3xl tk-float" />

      {/* Subtle gradient mesh */}
      <div className="pointer-events-none absolute inset-0 tk-animated-gradient opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(74,222,128,0.16),transparent_55%),radial-gradient(circle_at_45%_80%,rgba(16,185,129,0.12),transparent_55%)]" />
    </div>
  );
}

