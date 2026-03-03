"use client";

/**
 * APPLY AS PEER MENTOR — teal/white split, same design system.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { HeartHandshake, Loader2 } from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

export default function PeerMentorApplyPage() {
  const router = useRouter();
  const { applyForRole, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [about, setAbout] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entered, setEntered] = useState(false);
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
      await applyForRole({ role: "peer-mentor", fullName, email, specialization, about, password });
      router.push("/verify-email");
    } catch (err: any) {
      setError(err?.message || "Could not submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    email.includes("@") &&
    specialization.trim().length > 0 &&
    about.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const s = (ms: number) =>
    `transition-all duration-500 delay-[${ms}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Help others\nthrive."}
        poster="/images/peer-mentor-hero.jpg"
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
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-[#2BB5A0]/20
            bg-[#2BB5A0]/5 px-4 py-2 ${s(200)}`}>
            <HeartHandshake className="h-4 w-4 text-[#2BB5A0]" />
            <span className="text-sm font-medium text-[#1A7A6E]">Peer Mentor</span>
          </div>

          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl ${s(280)}`}>
            Apply as Mentor
          </h1>
          <p className={`mt-2 text-sm text-[#6B8C89] ${s(330)}`}>
            Requires admin approval. Uses your real identity.
          </p>

          {hydrated && !isFirebaseBacked && (
            <div className="mt-4 rounded-xl border border-[#F5C842]/30 bg-[#F5C842]/10 p-3">
              <p className="text-sm font-semibold text-[#E8A800]">Demo mode</p>
              <p className="mt-1 text-xs text-[#E8A800]/70">Add Firebase keys to enable applications.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className={s(380)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Kwame Asare" className="tk-input" />
            </div>

            <div className={s(430)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder="kwame@example.com" className="tk-input" />
            </div>

            <div className={s(480)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Specialization</label>
              <input value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Exam stress, peer coaching" className="tk-input" />
            </div>

            <div className={s(530)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">About you</label>
              <textarea value={about} onChange={(e) => setAbout(e.target.value)}
                placeholder="Experience, availability, why you want to help..."
                rows={3} className="tk-input resize-none" />
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(580)}`}>
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

            <div className={`pt-1 ${s(630)}`}>
              <button type="submit" disabled={!isFirebaseBacked || isLoading || !isFormValid}
                className="tk-btn-gold">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
                  </span>
                ) : "Submit application"}
              </button>
            </div>
          </form>

          <p className={`mt-6 text-center text-sm text-[#6B8C89] ${s(680)}`}>
            Already applied?{" "}
            <Link href="/login?role=peer-mentor" className="font-semibold text-[#2BB5A0] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
