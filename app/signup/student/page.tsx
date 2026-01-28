"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { ArrowLeft, GraduationCap, Shield } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await signupStudent({
        fullName,
        email,
        schoolEmail,
        educationLevel,
        school,
        password,
      });
      router.push("/student/dashboard");
    } catch (err: any) {
      setError(err?.message || "Could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@") &&
    schoolEmail.trim().length > 0 &&
    schoolEmail.includes("@") &&
    educationLevel.trim().length > 0 &&
    school.trim().length > 0 &&
    password.trim().length >= 6 &&
    confirmPassword.trim().length >= 6 &&
    password === confirmPassword;

  return (
    <div className="flex h-screen min-h-[700px] overflow-hidden">
      {/* Left - Hero Image */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/images/student-hero.jpg"
          alt="Students studying"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900/50" />
        
        <Link href="/" className="absolute left-6 top-6 z-10 flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>

        {/* Info card */}
        <div className="absolute bottom-6 left-6 right-6 z-10 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-primary-300" />
            <div>
              <p className="font-semibold text-white">Your privacy is protected</p>
              <p className="mt-1 text-sm text-white/70">
                Enable Anonymous Mode in Settings after sign up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Dark Glass Panel */}
      <div className="relative flex w-full flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 lg:w-1/2">
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          <Link href="/" className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white lg:hidden">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div className="mx-auto w-full max-w-md flex-1">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2">
              <GraduationCap className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-300">Student</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">Create account</h1>
            <p className="mt-2 text-sm text-gray-400">Join Theraklick for calm, private support.</p>

            {!isFirebaseBacked && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="text-sm font-semibold text-yellow-300">Demo mode</p>
                <p className="mt-1 text-xs text-yellow-300/70">Add Firebase keys to enable signup.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Full name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ama Mensah"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="ama@gmail.com"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">School email</label>
                  <Input
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    type="email"
                    placeholder="ama@ug.edu.gh"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Education level</label>
                  <Input
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    placeholder="Level 200"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">School</label>
                  <Input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="University of Ghana"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Confirm password</label>
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {error && <p className="text-sm font-medium text-red-400">{error}</p>}

              <Button
                type="submit"
                size="lg"
                className={`w-full transition-all ${
                  !isFirebaseBacked || isLoading || !isFormValid
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600"
                }`}
                disabled={!isFirebaseBacked || isLoading || !isFormValid}
              >
                {isLoading ? "Creating..." : "Create account"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login?role=student" className="font-semibold text-primary-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile background */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image src="/images/student-hero.jpg" alt="Students" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gray-900/90" />
      </div>
    </div>
  );
}
