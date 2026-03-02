"use client";

/**
 * AUTH — Login screen.
 *
 * LAYOUT (mobile):  Teal gradient top 30 % → white card slides up from bottom.
 * LAYOUT (desktop): Teal left panel 45 % → white right panel with centered form.
 *
 * Animation: teal panel slides DOWN from above, white card slides UP from below.
 * They meet in the middle, then form fields stagger-fade in.
 */

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import {
  GraduationCap,
  HeartHandshake,
  UserCheck,
  Loader2,
} from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

type Role = "student" | "peer-mentor" | "counselor";

const roleConfig = {
  student: {
    title: "Student Sign In",
    subtitle: "Access your support dashboard",
    icon: GraduationCap,
    createLink: "/signup/student",
    createLabel: "Create account",
  },
  "peer-mentor": {
    title: "Peer Mentor Sign In",
    subtitle: "Continue supporting students",
    icon: HeartHandshake,
    createLink: "/apply/peer-mentor",
    createLabel: "Apply as mentor",
  },
  counselor: {
    title: "Counselor Sign In",
    subtitle: "Access your counselor dashboard",
    icon: UserCheck,
    createLink: "/apply/counselor",
    createLabel: "Apply as counselor",
  },
};

export function LoginClient({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [role] = useState<Role>(initialRole);
  const { loginWithEmail, isFirebaseBacked, profile, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  // Trigger enter animation after mount
  const [entered, setEntered] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const config = useMemo(() => roleConfig[role], [role]);
  const Icon = config.icon;

  useEffect(() => {
    setHydrated(true);
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  // Redirect after successful auth
  useEffect(() => {
    if (hasLoggedIn && !authLoading && profile && profile.role) {
      if (profile.status === "pending") {
        router.push("/pending-approval");
      } else if (profile.status === "disabled") {
        setError("Your account has been disabled. Please contact support.");
        setHasLoggedIn(false);
        setIsLoading(false);
      } else if (profile.role === role) {
        router.push(role === "student" ? "/student/dashboard" : `/${role}/dashboard`);
      } else {
        router.push(profile.role === "student" ? "/student/dashboard" : `/${profile.role}/dashboard`);
      }
    }
  }, [hasLoggedIn, profile, authLoading, role, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setHasLoggedIn(false);
    try {
      await loginWithEmail(email, password);
      setHasLoggedIn(true);
    } catch (err: any) {
      setError(err?.message || "Could not sign in. Please try again.");
      setIsLoading(false);
      setHasLoggedIn(false);
    }
  };

  /* shared transition helper */
  const stagger = (delayMs: number) =>
    `transition-all duration-500 delay-[${delayMs}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Your mind\ndeserves care."}
        poster="/images/student-hero.jpg"
      />

      {/* ── White card (bottom on mobile, right on desktop) ── */}
      <div
        className={`auth-right-panel relative z-10 flex flex-1 flex-col -mt-6 rounded-t-[28px] bg-white px-6 py-8
          shadow-2xl shadow-black/5
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:mt-0 lg:rounded-none lg:px-12 lg:shadow-none
          ${entered
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "translate-y-[60px] opacity-0 lg:translate-y-0 lg:translate-x-[60px]"}`}
      >
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {/* Role badge */}
          <div className={`mb-5 inline-flex items-center gap-2 self-start rounded-full
            border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 px-4 py-2
            transition-all duration-500 delay-200
            ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <Icon className="h-4 w-4 text-[#2BB5A0]" />
            <span className="text-sm font-medium text-[#1A7A6E]">
              {role === "student" ? "Student" : role === "peer-mentor" ? "Peer Mentor" : "Counselor"}
            </span>
          </div>

          {/* Heading */}
          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl
            transition-all duration-500 delay-300
            ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            {config.title}
          </h1>
          <p className={`mt-2 text-[#6B8C89] transition-all duration-500 delay-[350ms]
            ${entered ? "opacity-100" : "opacity-0"}`}>
            {config.subtitle}
          </p>

          {hydrated && !isFirebaseBacked && (
            <div className="mt-5 rounded-xl border border-[#F5C842]/30 bg-[#F5C842]/10 p-4">
              <p className="text-sm font-semibold text-[#E8A800]">Demo mode</p>
              <p className="mt-1 text-sm text-[#E8A800]/70">Firebase isn&apos;t configured.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className={`transition-all duration-500 delay-[400ms]
              ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <label className="mb-2 block text-sm font-semibold text-[#2BB5A0]">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                className="tk-input"
              />
            </div>

            <div className={`transition-all duration-500 delay-[480ms]
              ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <label className="mb-2 block text-sm font-semibold text-[#2BB5A0]">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                className="tk-input"
              />
            </div>

            {error && (
              <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className={`pt-2 transition-all duration-500 delay-[560ms]
              ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <button
                type="submit"
                disabled={!isFirebaseBacked || isLoading || !email.trim() || !password.trim()}
                className="tk-btn-gold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          {/* Footer link */}
          <div className={`mt-8 text-center transition-all duration-500 delay-[640ms]
            ${entered ? "opacity-100" : "opacity-0"}`}>
            <span className="text-sm text-[#6B8C89]">Don&apos;t have an account? </span>
            <Link
              href={config.createLink}
              className="text-sm font-semibold text-[#2BB5A0] hover:text-[#1A7A6E] hover:underline"
            >
              {config.createLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
