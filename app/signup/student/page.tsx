"use client";

/**
 * STUDENT SIGN UP — teal/white split with staggered form entrance.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { GraduationCap, Loader2 } from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

export default function StudentSignupPage() {
  const router = useRouter();
  const { signupStudent, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  // Defer isFirebaseBacked read until after hydration to avoid SSR mismatch
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setIsLoading(true);
    try {
      await signupStudent({ fullName, email, schoolEmail, educationLevel, school, password });
      router.push("/verify-email");
    } catch (err: any) {
      setError(err?.message || "Could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    email.includes("@") &&
    schoolEmail.includes("@") &&
    educationLevel.trim().length > 0 &&
    school.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  /* helper: stagger class */
  const s = (ms: number) =>
    `transition-all duration-500 delay-[${ms}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Join Theraklick\nfor students like you."}
      />

      {/* ── White card ── */}
      <div
        className={`auth-right-panel relative z-10 flex flex-1 flex-col -mt-6 rounded-t-[28px] bg-white px-6 py-6
          shadow-2xl shadow-black/5
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:mt-0 lg:rounded-none lg:px-10 lg:py-8 lg:shadow-none
          ${entered
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "translate-y-[60px] opacity-0 lg:translate-y-0 lg:translate-x-[60px]"}`}
      >
        <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto">
          {/* Badge */}
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-[#2BB5A0]/20
            bg-[#2BB5A0]/5 px-4 py-2 ${s(200)}`}>
            <GraduationCap className="h-4 w-4 text-[#2BB5A0]" />
            <span className="text-sm font-medium text-[#1A7A6E]">Student</span>
          </div>

          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl ${s(280)}`}>
            Create account
          </h1>
          <p className={`mt-2 text-sm text-[#6B8C89] ${s(330)}`}>
            Join Theraklick for calm, private support.
          </p>

          {/* Only render after hydration — isFirebaseBacked differs SSR vs client */}
          {hydrated && !isFirebaseBacked && (
            <div className="mt-4 rounded-xl border border-[#F5C842]/30 bg-[#F5C842]/10#F5C842]/5 p-3">
              <p className="text-sm font-semibold text-[#E8A800]">Demo mode</p>
              <p className="mt-1 text-xs text-[#E8A800]/70">Add Firebase keys to enable signup.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className={s(380)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Ama Mensah" className="tk-input" />
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(430)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)}
                  type="email" placeholder="ama@gmail.com" className="tk-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">School email</label>
                <input value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)}
                  type="email" placeholder="ama@ug.edu.gh" className="tk-input" />
              </div>
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(480)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Education level</label>
                <input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                  placeholder="Level 200" className="tk-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">School</label>
                <input value={school} onChange={(e) => setSchool(e.target.value)}
                  placeholder="University of Ghana" className="tk-input" />
              </div>
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(530)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)}
                  type="password" placeholder="••••••••" className="tk-input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Confirm</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password" placeholder="••••••••" className="tk-input" />
              </div>
            </div>

            {error && (
              <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className={`pt-1 ${s(580)}`}>
              <button type="submit" disabled={!isFirebaseBacked || isLoading || !isFormValid}
                className="tk-btn-gold">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Creating…
                  </span>
                ) : "Create account"}
              </button>
            </div>
          </form>

          <p className={`mt-6 text-center text-sm text-[#6B8C89] ${s(640)}`}>
            Already have an account?{" "}
            <Link href="/login?role=student" className="font-semibold text-[#2BB5A0] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
