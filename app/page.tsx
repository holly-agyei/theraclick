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
          LANDING CONTENT
          ════════════════════════════════════════ */}
      <div className={`relative min-h-[100dvh]
        transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        ${phase >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-[0.95]"}`}>

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F4F47] via-[#1A7A6E] to-[#2BB5A0]" />

        {/* Floating ambient orbs — Layer 2 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-[18%] h-72 w-72 rounded-full bg-[#2BB5A0] opacity-25 blur-[80px]
            animate-[tk-drift_12s_ease-in-out_infinite_alternate]" />
          <div className="absolute -right-16 bottom-[18%] h-56 w-56 rounded-full bg-[#F5C842] opacity-[0.12] blur-[80px]
            animate-[tk-drift-2_15s_ease-in-out_infinite_alternate]" />
          <div className="absolute left-[38%] top-[48%] h-64 w-64 rounded-full bg-[#0F4F47] opacity-30 blur-[80px]
            animate-[tk-pulse-orb_8s_ease-in-out_infinite]" />
        </div>

        {/* Particles — Layer 1 */}
        <Particles count={35} className="z-[1]" />

        {/* Content — Layer 3+4 */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">

          {/* Brain logo */}
          <div className={`transition-all duration-700 delay-100
            ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${phase >= 5 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
            <BrainMark className="h-16 w-16 text-white md:h-20 md:w-20" />
          </div>

          {/* "Welcome to" */}
          <p className={`mt-8 text-[13px] font-light uppercase tracking-[0.35em] text-white/70
            transition-all duration-500 delay-200
            ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            Welcome to
          </p>

          {/* THERAKLICK */}
          <h1 className={`mt-2 text-[36px] font-bold tracking-[0.12em] text-white
            transition-all duration-[600ms] delay-300
            ease-[cubic-bezier(0.34,1.56,0.64,1)] md:text-[48px]
            ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            THERAKLICK
          </h1>

          {/* Subtle descriptor */}
          <p className={`mt-3 text-[14px] font-light text-white/50
            transition-all duration-500 delay-[400ms]
            ${phase >= 5 ? "opacity-100" : "opacity-0"}`}>
            Your mind deserves care.
          </p>

          {/* ── CTAs ── */}
          <div className={`mt-14 w-full max-w-[300px] space-y-4
            transition-all duration-500 delay-500
            ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

            {/* Primary: Get Started */}
            <button
              onClick={() => router.push("/signup/student")}
              className="group flex w-full items-center justify-center gap-2 rounded-full
                bg-white py-4 text-[15px] font-semibold text-[#0F4F47]
                shadow-xl shadow-black/10
                transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:scale-[1.04] hover:shadow-2xl active:scale-[0.97]"
            >
              Get started — It&apos;s free
              <ArrowRight className="h-4 w-4 transition-transform duration-300
                group-hover:translate-x-1" />
            </button>

            {/* Sign in */}
            <p className="text-center text-[13px] text-white/70">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login?role=student")}
                className="font-semibold text-[#F5C842] underline-offset-4
                  transition-colors hover:text-[#FFE480] hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* ── Secondary: helper roles ── */}
          <div className={`mt-12 text-center
            transition-all duration-500 delay-[650ms]
            ${phase >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <p className="mb-3 text-[12px] text-white/50">Want to help others?</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/login?role=peer-mentor")}
                className="rounded-full bg-[#F5C842] px-6 py-2.5
                  text-[13px] font-semibold text-[#0D1F1D]
                  shadow-lg shadow-[#F5C842]/20
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:scale-[1.04] hover:bg-[#FFE480] hover:shadow-xl active:scale-[0.97]"
              >
                Peer mentor
              </button>
              <button
                onClick={() => router.push("/login?role=counselor")}
                className="rounded-full bg-[#F5C842] px-6 py-2.5
                  text-[13px] font-semibold text-[#0D1F1D]
                  shadow-lg shadow-[#F5C842]/20
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:scale-[1.04] hover:bg-[#FFE480] hover:shadow-xl active:scale-[0.97]"
              >
                Counselor
              </button>
            </div>
          </div>

          {/* Admin link — barely visible */}
          <button
            onClick={() => router.push("/admin/login")}
            className="mt-10 text-[11px] text-white/20 transition-colors hover:text-white/50"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}
