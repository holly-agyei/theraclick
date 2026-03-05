"use client";

/**
 * STUDENT SIGN UP — teal/white split with staggered form entrance.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { GraduationCap, Loader2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

const EDUCATION_LEVELS = [
  "Level 100",
  "Level 200",
  "Level 300",
  "Level 400",
  "Postgraduate",
  "Other",
];

const GHANA_UNIVERSITIES = [
  "University of Ghana (UG)",
  "KNUST",
  "University of Cape Coast (UCC)",
  "University of Education, Winneba (UEW)",
  "University for Development Studies (UDS)",
  "Ashesi University",
  "GIMPA",
  "Central University",
  "Academic City University College",
  "Accra Technical University",
  "Cape Coast Technical University",
  "Ghana Communication Technology University",
  "Ho Technical University",
  "Koforidua Technical University",
  "Kumasi Technical University",
  "Kwame Nkrumah University of Science and Technology",
  "Pentecost University",
  "Presbyterian University of Ghana",
  "Regent University College",
  "Takoradi Technical University",
  "University of Energy and Natural Resources (UENR)",
  "University of Ghana, Legon",
  "University of Health and Allied Sciences (UHAS)",
  "University of Mines and Technology (UMaT)",
  "University of Professional Studies, Accra (UPSA)",
  "Valley View University",
  "Wisconsin International University College",
  "Zenith University College",
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

function SchoolCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    GHANA_UNIVERSITIES.filter((s) => s.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger — matches tk-input styling exactly */}
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-[14px] border-[1.5px] border-[#E5E7EB] bg-white px-4 py-[14px] text-left text-[15px] outline-none transition-all hover:border-gray-300 focus:border-[#16A34A] focus:shadow-[0_0_0_4px_rgba(22,163,74,0.1)]">
        <span className={`truncate ${value ? "text-gray-900" : "text-[#9CA3AF]"}`}>
          {value || "Select your school"}
        </span>
        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 bottom-full z-50 mb-2 rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/15"
          style={{ maxHeight: "320px" }}>
          {/* Search */}
          <div className="border-b border-gray-100 p-3">
            <input
              ref={inputRef}
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#2BB5A0] focus:bg-white focus:ring-2 focus:ring-[#2BB5A0]/20"
            />
          </div>
          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto overscroll-contain p-1.5">
            {filtered.map((s) => (
              <button key={s} type="button"
                onClick={() => { onChange(s); setOpen(false); setSearch(""); }}
                className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-[14px] transition-colors
                  ${value === s
                    ? "bg-[#0F4F47]/10 font-semibold text-[#0F4F47]"
                    : "text-gray-700 hover:bg-gray-50"}`}>
                <span className="truncate">{s}</span>
                {value === s && <CheckIcon className="ml-auto h-4 w-4 shrink-0 text-[#0F4F47]" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-4 text-center text-[14px] text-gray-400">No universities found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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
      await signupStudent({ fullName, email, schoolEmail, educationLevel, school, password });
      router.push("/verify-email");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create your account. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    email.includes("@") &&
    educationLevel.trim().length > 0 &&
    school.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreedToTerms;

  const s = (ms: number) =>
    `transition-all duration-500 delay-[${ms}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"A safe space for every\nGhanaian student."}
      />

      {/* White card */}
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
            Join TheraClick for calm, private support.
          </p>

          {/* Anonymous mode callout */}
          <p className={`mt-1.5 text-[13px] text-[#2BB5A0] ${s(350)}`}>
            Prefer to stay private?{" "}
            <span className="font-semibold underline underline-offset-2 cursor-help" title="After sign-up, enable anonymous mode from Settings to hide your real identity from everyone on the platform.">
              Use anonymous mode &rarr;
            </span>
          </p>

          {hydrated && !isFirebaseBacked && (
            <div className="mt-4 rounded-xl border border-[#F5C842]/30 bg-[#F5C842]/10 p-3">
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
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">
                  School email <span className="font-normal text-[#6B8C89]">(optional)</span>
                </label>
                <input value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)}
                  type="email" placeholder="ama@ug.edu.gh" className="tk-input" />
              </div>
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(480)}`}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">Education level</label>
                <div className="relative">
                  <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                    className="tk-input appearance-none pr-10">
                    <option value="" disabled>Select level</option>
                    {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#2BB5A0]">School</label>
                <SchoolCombobox value={school} onChange={setSchool} />
              </div>
            </div>

            <div className={`grid gap-4 sm:grid-cols-2 ${s(530)}`}>
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
                {/* Password strength bar */}
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
            <div className={`flex items-start gap-3 ${s(560)}`}>
              <input type="checkbox" id="terms" checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#0F4F47] accent-[#0F4F47] cursor-pointer" />
              <label htmlFor="terms" className="text-[13px] leading-[1.5] text-[#6B8C89] cursor-pointer">
                I agree to the{" "}
                <Link href="/privacy" className="font-semibold text-[#2BB5A0] underline underline-offset-2" target="_blank">
                  Privacy Policy
                </Link>{" "}
                and Terms of Service
              </label>
            </div>

            {error && (
              <div className="tk-shake rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className={`pt-1 ${s(600)}`}>
              <button type="submit" disabled={!isFirebaseBacked || isLoading || !isFormValid}
                className="tk-btn-primary">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Creating…
                  </span>
                ) : "Create account"}
              </button>
            </div>
          </form>

          <p className={`mt-6 text-center text-sm text-[#6B8C89] ${s(660)}`}>
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
