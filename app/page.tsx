"use client";

/**
 * LANDING PAGE — The first breath.
 *
 * WHAT: Splash intro → animated hero landing.
 * WHY:  First impression. A 20-year-old student in Accra opens this
 *       at 11 pm after a hard exam. It should feel like exhaling.
 * HOW:
 *   - Phase 0–4: Splash — logo springs in, wordmark fades, tagline breathes
 *     in from blur, then everything scales up and fades away.
 *   - Phase 5: Landing — teal gradient with floating orbs, particles, and
 *     staggered content entrance with spring easing.
 *   - Total splash: ~4 s. Feels cinematic, not slow.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrainMark } from "@/components/Logo";
import { Particles } from "@/components/Particles";

export default function WelcomePage() {
  const router = useRouter();

  // Splash phases:
  //  0 = blank,  1 = logo in,  2 = wordmark,  3 = tagline,
  //  4 = zoom-through exit,  5 = landing visible
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // logo springs in
      setTimeout(() => setPhase(2), 1100),  // wordmark fades letter-by-letter
      setTimeout(() => setPhase(3), 2000),  // tagline breathes in
      setTimeout(() => setPhase(4), 3200),  // zoom-through begins
      setTimeout(() => setPhase(5), 4000),  // landing blooms in
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const splashVisible = phase < 5;
  const splashExiting = phase === 4;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0F4F47]">

      {/* ════════════════════════════════════════
          SPLASH OVERLAY
          ════════════════════════════════════════ */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F4F47]
          transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${splashExiting
            ? "scale-[1.08] opacity-0"
            : splashVisible
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-[1.08] opacity-0"}`}
      >
        {/* Brain icon — springs in */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
          <BrainMark className="h-20 w-20 text-white md:h-24 md:w-24" />
        </div>

        {/* Wordmark — slides up */}
        <h1 className={`mt-6 text-[28px] font-bold tracking-[0.25em] text-white
          transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:text-[34px]
          ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          THERAKLICK
        </h1>

        {/* Tagline — breathes in from blur */}
        <p className={`mt-4 text-[15px] font-light tracking-wide text-[#7BD8CA]
          transition-all duration-[600ms]
          ${phase >= 3 ? "opacity-100 blur-0" : "opacity-0 blur-[8px]"}`}>
          You are in the right place.
        </p>
      </div>

      {/* ════════════════════════════════════════
          LANDING CONTENT — 50/50 split
          ════════════════════════════════════════ */}
      <div className={`flex min-h-[100dvh] flex-col lg:flex-row
        transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        ${phase >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-[0.95]"}`}>

        {/* ── LEFT HALF: Video + branding ── */}
        <div className={`relative shrink-0 overflow-hidden select-none
          h-[240px] lg:h-auto lg:w-1/2
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${phase >= 5
            ? "translate-y-0 lg:translate-x-0"
            : "-translate-y-[60px] lg:-translate-x-[60px] lg:translate-y-0"}`}>

          {/* Poster fallback */}
          <div
            className="absolute inset-0 z-[0] bg-cover bg-[center_top]"
            style={{ backgroundImage: "url(/images/student-hero.jpg)" }}
          />

          {/* Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/student-hero.jpg"
            src="/videos/campus.mp4?v=3"
            className="absolute inset-0 z-[1] h-full w-full object-cover object-[center_top]
              will-change-transform lg:animate-[videoBreath_18s_ease-in-out_infinite_alternate]
              scale-[1.05] lg:scale-100"
          />

          {/* Teal gradient overlay */}
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                "linear-gradient(160deg, rgba(10,60,52,0.75) 0%, rgba(43,181,160,0.50) 50%, rgba(10,60,52,0.80) 100%)",
            }}
          />

          {/* Ambient orbs */}
          <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
            <div
              className="absolute -left-20 -top-20
                h-[200px] w-[200px] lg:h-[380px] lg:w-[380px]
                rounded-full blur-[50px] lg:blur-[70px] mix-blend-screen
                lg:animate-[driftOrb1_14s_ease-in-out_infinite_alternate]"
              style={{
                background: "radial-gradient(circle, rgba(43,181,160,0.35) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -right-[60px] bottom-[10%]
                h-[160px] w-[160px] lg:h-[280px] lg:w-[280px]
                rounded-full blur-[50px] lg:blur-[70px] mix-blend-screen
                lg:animate-[driftOrb2_18s_ease-in-out_infinite_alternate]"
              style={{
                background: "radial-gradient(circle, rgba(245,200,66,0.20) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Particles overlay */}
          <Particles count={20} className="z-[4]" />

          {/* Content overlay — logo, tagline, stats */}
          <div className="absolute inset-0 z-[5] flex flex-col justify-between p-5 lg:p-10">
            {/* Top: Logo */}
            <div className={`hidden items-center gap-3 lg:flex
              transition-all duration-[600ms] delay-100
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
              <BrainMark className="h-10 w-10 text-white" />
              <span className="text-xl font-bold tracking-tight text-white">Theraklick</span>
            </div>

            {/* Center: Tagline — desktop only */}
            <div className="hidden flex-1 flex-col justify-center py-8 lg:flex">
              <h2 className={`text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.15] text-white
                transition-all duration-700 delay-[400ms]
                ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                Your mind
                <span className="block text-[#F5C842]">deserves care.</span>
              </h2>
              <p className={`mt-4 max-w-[360px] text-[15px] font-light leading-relaxed text-white/75
                transition-all duration-500 delay-500
                ${phase >= 5 ? "opacity-100" : "opacity-0"}`}>
                Professional counseling, peer support, and AI-powered wellness — built for African university students.
              </p>
            </div>

            {/* Bottom: Stats — desktop only */}
            <div className={`hidden items-center gap-6 rounded-[20px]
              border border-white/[0.12] bg-white/[0.08] p-5 backdrop-blur-2xl lg:flex
              transition-all duration-700 delay-700
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <StatCell value="100%" label="Anonymous" />
              <div className="h-9 w-px bg-white/15" />
              <StatCell value="24/7" label="Always available" />
              <div className="h-9 w-px bg-white/15" />
              <StatCell value="Free" label="No hidden costs" />
            </div>

            {/* Mobile: compact brand + tagline */}
            <div className="flex flex-1 items-end justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <BrainMark className="h-7 w-7 text-white" />
                <span className="text-base font-bold text-white">Theraklick</span>
              </div>
              <p className="text-right text-[1.1rem] font-bold leading-tight text-white">
                Your mind<br />
                <span className="text-[#F5C842]">deserves care.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT HALF: CTAs with frosted glass feel ── */}
        <div className={`relative z-10 flex flex-1 flex-col -mt-6 rounded-t-[28px] px-6 py-8
          bg-white
          shadow-2xl shadow-black/5
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:mt-0 lg:rounded-none lg:px-12 lg:shadow-none
          ${phase >= 5
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "translate-y-[60px] opacity-0 lg:translate-y-0 lg:translate-x-[60px]"}`}>

          {/* Subtle decorative gradient accent — top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[28px] bg-gradient-to-r from-transparent via-[#2BB5A0]/40 to-transparent lg:rounded-none" />

          {/* Faint radial glow behind the card content */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            h-[500px] w-[500px] rounded-full bg-[#2BB5A0]/[0.04] blur-[100px]" />

          <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
            {/* Brain logo */}
            <div className={`transition-all duration-700 delay-100
              ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${phase >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
              <BrainMark className="h-14 w-14 text-[#0F4F47] md:h-16 md:w-16" />
            </div>

            {/* Welcome */}
            <p className={`mt-6 text-[13px] font-medium uppercase tracking-[0.35em] text-gray-500
              transition-all duration-500 delay-200
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              Welcome to
            </p>

            <h1 className={`mt-1 text-[32px] font-extrabold tracking-[0.08em] text-gray-900
              transition-all duration-[600ms] delay-300 md:text-[40px]
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              THERAKLICK
            </h1>

            <p className={`mt-2 text-[15px] font-medium text-gray-600
              transition-all duration-500 delay-[400ms]
              ${phase >= 5 ? "opacity-100" : "opacity-0"}`}>
              Your safe space for mental wellness.
            </p>

            {/* CTAs */}
            <div className={`mt-10 space-y-4
              transition-all duration-500 delay-500
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

              {/* Primary CTA */}
              <button
                onClick={() => router.push("/signup/student")}
                className="group flex w-full items-center justify-center gap-2 rounded-full
                  bg-[#F5C842] py-4 text-[15px] font-bold text-[#0D1F1D]
                  shadow-lg shadow-[#F5C842]/30
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:scale-[1.03] hover:bg-[#FFD95A] hover:shadow-xl
                  active:scale-[0.97]"
              >
                Get started — It&apos;s free
                <ArrowRight className="h-4 w-4 transition-transform duration-300
                  group-hover:translate-x-1.5" />
              </button>

              <p className="text-center text-[13px] text-gray-500">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login?role=student")}
                  className="font-bold text-[#0F4F47] underline-offset-4
                    transition-all duration-200 hover:text-[#1A7A6E] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className={`mt-8 flex items-center gap-4
              transition-all duration-500 delay-[600ms]
              ${phase >= 5 ? "opacity-100" : "opacity-0"}`}>
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] uppercase tracking-widest text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Helper roles */}
            <div className={`mt-6
              transition-all duration-500 delay-[650ms]
              ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <p className="mb-4 text-center text-[12px] font-medium text-gray-500">Want to help others?</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => router.push("/login?role=peer-mentor")}
                  className="rounded-full border-2 border-[#0F4F47] bg-transparent px-6 py-2.5
                    text-[13px] font-bold text-[#0F4F47]
                    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    hover:scale-[1.04] hover:bg-[#0F4F47] hover:text-white
                    active:scale-[0.97]"
                >
                  Peer mentor
                </button>
                <button
                  onClick={() => router.push("/login?role=counselor")}
                  className="rounded-full border-2 border-[#0F4F47] bg-transparent px-6 py-2.5
                    text-[13px] font-bold text-[#0F4F47]
                    transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    hover:scale-[1.04] hover:bg-[#0F4F47] hover:text-white
                    active:scale-[0.97]"
                >
                  Counselor
                </button>
              </div>
            </div>

            {/* Admin — barely visible */}
            <button
              onClick={() => router.push("/admin/login")}
              className="mt-8 self-center text-[11px] text-gray-300 transition-colors hover:text-gray-500"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold tabular-nums text-[#F5C842]">
        {value}
      </span>
      <span className="whitespace-nowrap text-[0.72rem] uppercase tracking-[0.05em] text-white/65">
        {label}
      </span>
    </div>
  );
}
