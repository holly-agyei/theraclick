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
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import {
  GraduationCap,
  HeartHandshake,
  UserCheck,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  Shield,
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
  const { loginWithEmail, logout, isFirebaseBacked, profile, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [entered, setEntered] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const config = useMemo(() => roleConfig[role], [role]);
  const Icon = config.icon;

  useEffect(() => {
    setHydrated(true);
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const [roleMismatch, setRoleMismatch] = useState<string | null>(null);

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
        const roleLabels: Record<string, string> = {
          student: "Student",
          "peer-mentor": "Peer Mentor",
          counselor: "Counselor",
        };
        const actualRole = profile.role;
        void logout();
        setRoleMismatch(actualRole);
        setError(
          `This is a ${roleLabels[actualRole] || actualRole} account. Please sign in on the ${roleLabels[actualRole] || actualRole} login page.`
        );
        setIsLoading(false);
        setHasLoggedIn(false);
      }
    }
  }, [hasLoggedIn, profile, authLoading, role, router, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setIsLoading(true);
    setHasLoggedIn(false);
    try {
      await loginWithEmail(email, password);
      setHasLoggedIn(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        setError(null);
      } else {
        setError(msg || "Could not sign in. Please try again.");
      }
      setIsLoading(false);
      setHasLoggedIn(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth || resendCooldown > 0) return;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("Could not resend verification email. Try again later.");
    }
  };

  const stagger = (delayMs: number) =>
    `transition-all duration-500 delay-[${delayMs}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Your feelings are valid.\nYour privacy is protected."}
      />

      {/* White card */}
      <div
        className={`auth-right-panel relative z-10 flex flex-1 flex-col -mt-6 rounded-t-[28px] bg-white px-6 py-8
          shadow-2xl shadow-black/5
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:mt-0 lg:rounded-none lg:px-12 lg:shadow-none
          ${entered
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "translate-y-[60px] opacity-0 lg:translate-y-0 lg:translate-x-[60px]"}`}
      >
        {/* justify-center ensures vertical centering */}
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
            <div className={stagger(400)}>
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

            <div className={stagger(480)}>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-[#2BB5A0]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-semibold text-[#0F4F47] hover:text-[#2BB5A0] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="tk-input pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            {/* Email verification notice */}
            {needsVerification && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Verify your email first</p>
                    <p className="mt-1 text-sm text-amber-700">
                      We sent a verification link to <span className="font-medium">{email}</span>. Check your inbox (and spam folder) and click the link, then come back and sign in.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0}
                      className="mt-3 text-sm font-semibold text-[#2BB5A0] hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend verification email"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
                {roleMismatch && (
                  <Link
                    href={`/login?role=${roleMismatch}`}
                    className="mt-2 inline-block text-sm font-semibold text-[#2BB5A0] hover:underline"
                  >
                    Go to {roleMismatch === "student" ? "Student" : roleMismatch === "peer-mentor" ? "Peer Mentor" : "Counselor"} login &rarr;
                  </Link>
                )}
              </div>
            )}

            <div className={`pt-2 ${stagger(560)}`}>
              <button
                type="submit"
                disabled={!isFirebaseBacked || isLoading || !email.trim() || !password.trim()}
                className="tk-btn-primary"
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

          {/* Anonymous mode link */}
          <div className={`mt-5 flex items-center justify-center gap-2 ${stagger(620)}`}>
            <Shield className="h-3.5 w-3.5 text-[#2BB5A0]" />
            <span className="text-[13px] text-[#6B8C89]">
              Prefer privacy?{" "}
              <span className="font-semibold text-[#2BB5A0] underline underline-offset-2 cursor-help"
                title="After signing in, enable anonymous mode from Settings to hide your real identity across the platform.">
                Continue anonymously &rarr;
              </span>
            </span>
          </div>

          {/* Footer link */}
          <div className={`mt-6 text-center ${stagger(660)}`}>
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
