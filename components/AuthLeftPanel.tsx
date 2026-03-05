"use client";

/**
 * AUTH LEFT PANEL — The living, breathing window.
 *
 * Layers (bottom → top):
 *   1. Interactive Globe — rotating Ghana-themed globe
 *   2. Gradient overlay — brand teal wash
 *   3. Ambient orbs — drifting, blurred light sources (static on mobile)
 *   4. Content — back link, logo, rotating feature slides, tagline, stats
 *
 * Mobile: collapses to a stable 200px banner. No animations, no jank.
 * Desktop: full cinematic experience.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";

/* ── Feature Slides (not testimonials — app isn't launched yet) ── */
const slides = [
  {
    text: "Book a session with a licensed professional counselor. In minutes, not weeks.",
    source: "Professional Counseling",
  },
  {
    text: "Talk to a peer mentor who has been through exactly what you are facing on campus.",
    source: "Peer Support Network",
  },
  {
    text: "Everything you share stays private. Your identity is protected. Always.",
    source: "Safe & Confidential",
  },
  {
    text: "Access support from your phone, any time. Between lectures, late at night, whenever you need it.",
    source: "Available 24/7",
  },
  {
    text: "Built specifically for African university students, by people who understand your world.",
    source: "Made for You",
  },
];

interface AuthLeftPanelProps {
  /** Controls the entrance animation. Set to true after mount. */
  entered: boolean;
  /** Two-line headline — use \n to split. Second line renders in gold. */
  headline?: string;
}

export function AuthLeftPanel({
  entered,
  headline = "Your mind\ndeserves care.",
}: AuthLeftPanelProps) {
  /* ── Slide rotator ── */
  const [slideIdx, setSlideIdx] = useState(0);
  const [slidePhase, setSlidePhase] = useState<
    "visible" | "exiting" | "entering"
  >("visible");

  useEffect(() => {
    const interval = setInterval(() => {
      setSlidePhase("exiting");
      setTimeout(() => {
        setSlideIdx((prev) => (prev + 1) % slides.length);
        setSlidePhase("entering");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setSlidePhase("visible"));
        });
      }, 500);
    }, 5000); // 5 s — longer than before, these are facts to read
    return () => clearInterval(interval);
  }, []);

  /* Stats are honest facts about the platform, not inflated numbers */

  const lines = headline.split("\n");

  return (
    <div
      className={`auth-left-panel relative shrink-0 overflow-hidden select-none
        h-[200px] lg:h-auto lg:w-[44%]
        transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${
          entered
            ? "translate-y-0 lg:translate-x-0"
            : "-translate-y-[60px] lg:-translate-x-[60px] lg:translate-y-0"
        }`}
    >
      {/* ─── Layer 1: Deep teal base ─── */}
      <div className="absolute inset-0 z-[1] bg-[#0A3C34]" />

      {/* ─── Layer 2: Interactive Globe (above the base, below content) ─── */}
      <div className="absolute inset-0 z-[2] flex items-center justify-center overflow-hidden">
        <InteractiveGlobe
          size={520}
          dotColor="rgba(255, 255, 255, ALPHA)"
          arcColor="rgba(255, 255, 255, 0.3)"
          markerColor="rgba(245, 200, 66, 1)"
          autoRotateSpeed={0.0012}
        />
      </div>

      {/* ─── Layer 3: Ambient orbs ─── */}
      <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
        {/* Teal orb — smaller + static on mobile, animated on desktop */}
        <div
          className="absolute -left-20 -top-20
            h-[200px] w-[200px] lg:h-[380px] lg:w-[380px]
            rounded-full blur-[50px] lg:blur-[70px]
            mix-blend-screen
            lg:animate-[driftOrb1_14s_ease-in-out_infinite_alternate]"
          style={{
            background:
              "radial-gradient(circle, rgba(43,181,160,0.35) 0%, transparent 70%)",
          }}
        />
        {/* Gold orb — smaller + static on mobile */}
        <div
          className="absolute -right-[60px] bottom-[10%]
            h-[160px] w-[160px] lg:h-[280px] lg:w-[280px]
            rounded-full blur-[50px] lg:blur-[70px]
            mix-blend-screen
            lg:animate-[driftOrb2_18s_ease-in-out_infinite_alternate]"
          style={{
            background:
              "radial-gradient(circle, rgba(245,200,66,0.20) 0%, transparent 70%)",
          }}
        />
        {/* Deep teal orb — hidden on mobile to save GPU */}
        <div
          className="absolute left-[30%] top-[45%]
            hidden lg:block
            h-[220px] w-[220px]
            rounded-full blur-[70px]
            mix-blend-screen
            animate-[driftOrb3_11s_ease-in-out_infinite_alternate]"
          style={{
            background:
              "radial-gradient(circle, rgba(43,181,160,0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ─── Layer 4: Content ─── */}
      <div className="absolute inset-0 z-[4] flex flex-col justify-between p-5 lg:p-10">
        {/* ─── Top: Back + Logo ─── */}
        <div>
          <Link
            href="/"
            className={`inline-flex items-center gap-2 text-white/80
              transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              hover:text-white touch-manipulation
              ${
                entered
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-5"
              }`}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div
            className={`mt-6 hidden items-center gap-3 lg:flex
              transition-all duration-[600ms] delay-100 ease-[cubic-bezier(0.16,1,0.3,1)]
              ${
                entered
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-5"
              }`}
          >
            <Image src="/images/theraklick-logo.png" alt="TheraClick" width={40} height={40} className="shrink-0 object-contain" />
            <span className="text-xl font-bold tracking-tight text-white">
              TheraClick
            </span>
          </div>
        </div>

        {/* ─── Center: Feature slide rotator + tagline — desktop only ─── */}
        <div className="hidden flex-1 flex-col justify-center py-8 lg:flex">
          {/* Feature slides */}
          <div className="mb-8">
            {/* Feature text */}
            <p
              className={`min-h-[4em] text-[clamp(1rem,1.8vw,1.25rem)] font-light
                leading-[1.65] text-white/90
                transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${slidePhase === "exiting" ? "opacity-0 -translate-y-2.5" : ""}
                ${
                  slidePhase === "entering" ? "opacity-0 translate-y-2.5" : ""
                }
                ${slidePhase === "visible" ? "opacity-100 translate-y-0" : ""}`}
            >
              {slides[slideIdx].text}
            </p>

            {/* Source label */}
            <p
              className={`mt-3 text-[0.78rem] uppercase tracking-[0.08em] text-[#F5C842]/75
                transition-all duration-500
                ${slidePhase === "exiting" ? "opacity-0" : "opacity-100"}`}
            >
              {slides[slideIdx].source}
            </p>
          </div>

          {/* Tagline */}
          <h2
            className={`text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.15] text-white
              transition-all duration-700 delay-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              ${
                entered
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
          >
            {lines.map((line, i) => (
              <span key={i} className="block">
                {i > 0 ? (
                  <span className="text-[#F5C842]">{line}</span>
                ) : (
                  line
                )}
              </span>
            ))}
          </h2>
        </div>

        {/* ─── Mobile: compact brand + tagline (row layout) ─── */}
        <div className="flex flex-1 items-end justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <Image src="/images/theraklick-logo.png" alt="TheraClick" width={28} height={28} className="shrink-0 object-contain" />
              <span className="text-base font-bold text-white">TheraClick</span>
            </div>
          <p className="text-right text-[1.1rem] font-bold leading-tight text-white">
            {lines[0]}
            <br />
              {lines[1] && (
                <span className="text-[#F5C842]">{lines[1]}</span>
              )}
            </p>
        </div>
      </div>
    </div>
  );
}

