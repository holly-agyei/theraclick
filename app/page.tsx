"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Lock, Shield, Heart } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex h-screen min-h-[600px] overflow-hidden bg-gray-900">
      {/* Left - Hero Image */}
      <div className="relative hidden w-[55%] lg:block">
        <Image
          src="/images/welcome-hero.jpg"
          alt="Support and connection"
          fill
          priority
          className="object-cover"
          sizes="55vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900/50" />
        
        {/* Brand */}
        <div className="absolute left-8 top-8 z-10">
          <Logo className="text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Right - Dark Content Panel */}
      <div className="relative flex w-full flex-col lg:w-[45%]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />

        {/* Content - centered */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-8 lg:px-12 xl:px-16">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo className="text-white" />
          </div>

          <div className="w-full max-w-sm">
            {/* Main headline */}
            <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              You're not alone.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-400 xl:text-lg">
              Stress, anxiety, exams, relationships — we're here with calm, 
              private support whenever you need it.
            </p>

            {/* Trust badges - inline */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" /> Private
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> Safe
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-emerald-400" /> 24/7
              </span>
            </div>

            {/* Primary CTA */}
            <div className="mt-8">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 py-6 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500 hover:shadow-xl hover:shadow-emerald-500/30"
                onClick={() => router.push("/signup/student")}
              >
                Get started — it's free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <p className="mt-4 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login?role=student")}
                  className="font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Sign in
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

            {/* Secondary - Volunteers - compact */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Want to help others?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push("/login?role=peer-mentor")}
                  className="text-sm text-gray-400 transition-colors hover:text-emerald-400"
                >
                  Peer mentor
                </button>
                <button
                  onClick={() => router.push("/login?role=counselor")}
                  className="text-sm text-gray-400 transition-colors hover:text-emerald-400"
                >
                  Counselor
                </button>
              </div>
            </div>

            {/* Admin Link */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <button
                onClick={() => router.push("/admin/login")}
                className="text-xs text-gray-600 transition-colors hover:text-gray-400"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile background */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image
          src="/images/welcome-hero.jpg"
          alt="Support"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gray-900/90" />
      </div>
    </div>
  );
}
