"use client";

/**
 * Forgot Password page.
 *
 * HOW IT WORKS:
 * 1. User enters their email.
 * 2. We call Firebase Auth's `sendPasswordResetEmail`.
 * 3. Firebase sends a reset link to their inbox.
 * 4. User clicks the link → Firebase-hosted page lets them set a new password.
 *
 * WHY no custom reset page?
 * Firebase Auth handles the token verification and password update securely.
 * Building our own would mean duplicating security logic for no real benefit.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!auth) {
      setError("Firebase is not configured. Password reset is unavailable in demo mode.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[ForgotPassword] Sending reset email to:", email.trim());
      await sendPasswordResetEmail(auth, email.trim());
      console.log("[ForgotPassword] sendPasswordResetEmail resolved successfully");
      setIsSent(true);
    } catch (err: any) {
      console.error("[ForgotPassword] Error:", err?.code, err?.message);
      // Firebase error codes → friendly messages
      const code = err?.code || "";
      if (code === "auth/user-not-found") {
        setError("No account found with this email. Make sure you're using the email you signed up with.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else {
        setError(`Error: ${err?.code || "unknown"} — ${err?.message || "Something went wrong. Please try again."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Reset your\npassword."}
        poster="/images/student-hero.jpg"
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
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {/* Back link */}
          <Link
            href="/login"
            className={`mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B8C89] hover:text-[#2BB5A0]
              transition-all duration-500 delay-200
              ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          {/* Icon badge */}
          <div className={`mb-5 inline-flex items-center gap-2 self-start rounded-full
            border border-[#2BB5A0]/20 bg-[#2BB5A0]/5 px-4 py-2
            transition-all duration-500 delay-200
            ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <Mail className="h-4 w-4 text-[#2BB5A0]" />
            <span className="text-sm font-medium text-[#1A7A6E]">Password Reset</span>
          </div>

          {/* Heading */}
          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl
            transition-all duration-500 delay-300
            ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            Forgot your password?
          </h1>
          <p className={`mt-2 text-[#6B8C89] transition-all duration-500 delay-[350ms]
            ${entered ? "opacity-100" : "opacity-0"}`}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {isSent ? (
            /* ── Success state ── */
            <div className={`mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center
              transition-all duration-500 delay-[400ms]
              ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
              <p className="text-sm font-semibold text-green-800">Check your inbox</p>
              <p className="mt-2 text-sm text-green-700">
                We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <p className="mt-3 text-xs text-green-600">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => { setIsSent(false); setEmail(""); }}
                className="mt-4 text-sm font-semibold text-[#2BB5A0] hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

              {error && (
                <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <div className={`pt-2 transition-all duration-500 delay-[480ms]
                ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="tk-btn-gold"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className={`mt-8 text-center transition-all duration-500 delay-[560ms]
            ${entered ? "opacity-100" : "opacity-0"}`}>
            <span className="text-sm text-[#6B8C89]">Remember your password? </span>
            <Link
              href="/login"
              className="text-sm font-semibold text-[#2BB5A0] hover:text-[#1A7A6E] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
