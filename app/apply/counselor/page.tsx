"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { UserCheck, Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

const SPECIALIZATIONS = [
  "Anxiety & Stress",
  "Depression",
  "Grief & Loss",
  "Relationship Issues",
  "Academic Stress",
  "Self-Esteem",
  "Substance Use",
  "Trauma & PTSD",
  "Career Counseling",
  "Family Issues",
  "General Counseling",
  "Other",
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-400" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-orange-400" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-yellow-400" };
  if (score === 4) return { score: 4, label: "Strong", color: "bg-green-400" };
  return { score: 5, label: "Very strong", color: "bg-green-600" };
}

export default function CounselorApplyPage() {
  const router = useRouter();
  const { applyForRole, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [about, setAbout] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const pwStrength = getPasswordStrength(password);

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
      await applyForRole({ role: "counselor", fullName, email, specialization, about, password });
      router.push("/verify-email");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not submit. Please try again.";
      setError(msg);
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
    password === confirmPassword &&
    agreedToTerms;

  const s = (ms: number) =>
    `transition-all duration-500 delay-[${ms}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Make a\ndifference."}
      />

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
            <UserCheck className="h-4 w-4 text-[#2BB5A0]" />
            <span className="text-sm font-medium text-[#1A7A6E]">Counselor</span>
          </div>

          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl ${s(280)}`}>
            Apply as Counselor
          </h1>
          <p className={`mt-2 text-sm text-[#6B8C89] ${s(330)}`}>
            Requires admin approval. Your credentials will be verified.
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
                placeholder="Dr. Ama Boateng" className="tk-input" />
            </div>

            <div className={s(430)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder="ama@example.com" className="tk-input" />
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(480)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Specialization</label>
                <div className="relative">
                  <select value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                    className="tk-input appearance-none pr-10">
                    <option value="" disabled>Select area</option>
                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">
                  License no. <span className="font-normal text-[#6B8C89]">(optional)</span>
                </label>
                <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. GPC-1234" className="tk-input" />
              </div>
            </div>

            <div className={s(530)}>
              <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">About you</label>
              <textarea
                value={about} onChange={(e) => setAbout(e.target.value)}
                placeholder="Your qualifications, credentials, experience with students..."
                rows={3} className="tk-input resize-none"
              />
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(580)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Password</label>
                <div className="relative">
                  <input value={password} onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"} placeholder="••••••••"
                    className="tk-input pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwStrength.score ? pwStrength.color : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className={`mt-1 text-[11px] font-medium ${
                      pwStrength.score <= 1 ? "text-red-500" :
                      pwStrength.score <= 2 ? "text-orange-500" :
                      pwStrength.score <= 3 ? "text-yellow-600" : "text-green-600"
                    }`}>{pwStrength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Confirm</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showPassword ? "text" : "password"} placeholder="••••••••" className="tk-input" />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-[11px] font-medium text-red-500">Passwords don&apos;t match</p>
                )}
              </div>
            </div>

            {/* Terms checkbox */}
            <div className={`flex items-start gap-3 ${s(620)}`}>
              <input type="checkbox" id="terms" checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#0F4F47] accent-[#0F4F47] cursor-pointer" />
              <label htmlFor="terms" className="text-[13px] leading-[1.5] text-[#6B8C89] cursor-pointer">
                I agree to the{" "}
                <Link href="/privacy" className="font-semibold text-[#2BB5A0] underline underline-offset-2" target="_blank">
                  Privacy Policy
                </Link>,{" "}
                Terms of Service, and the Counselor Code of Conduct
              </label>
            </div>

            {error && (
              <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className={`pt-1 ${s(660)}`}>
              <button type="submit" disabled={!isFirebaseBacked || isLoading || !isFormValid}
                className="tk-btn-primary">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
                  </span>
                ) : "Submit application"}
              </button>
            </div>
          </form>

          <p className={`mt-6 text-center text-sm text-[#6B8C89] ${s(700)}`}>
            Already applied?{" "}
            <Link href="/login?role=counselor" className="font-semibold text-[#2BB5A0] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
