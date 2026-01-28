"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { ArrowLeft, HeartHandshake, Shield } from "lucide-react";

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
      await applyForRole({
        role: "peer-mentor",
        fullName,
        email,
        specialization,
        about,
        password,
      });
      router.push("/pending-approval");
    } catch (err: any) {
      setError(err?.message || "Could not submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@") &&
    specialization.trim().length > 0 &&
    about.trim().length > 0 &&
    password.trim().length >= 6 &&
    confirmPassword.trim().length >= 6 &&
    password === confirmPassword;

  return (
    <div className="flex h-screen min-h-[700px] overflow-hidden">
      {/* Left - Hero Image */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/images/peer-mentor-hero.jpg"
          alt="Peer mentors supporting each other"
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
              <p className="font-semibold text-white">Confidentiality matters</p>
              <p className="mt-1 text-sm text-white/70">
                You'll follow strict privacy guidelines and escalate when needed.
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
              <HeartHandshake className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-300">Peer Mentor</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">Apply as Mentor</h1>
            <p className="mt-2 text-sm text-gray-400">Requires admin approval. Uses your real identity.</p>

            {!isFirebaseBacked && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="text-sm font-semibold text-yellow-300">Demo mode</p>
                <p className="mt-1 text-xs text-yellow-300/70">Add Firebase keys to enable applications.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Full name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Asare"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="kwame@example.com"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Specialization</label>
                <Input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Exam stress, peer coaching"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">About you</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Experience, availability, why you want to help..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
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
                  <label className="mb-1 block text-sm font-medium text-gray-300">Confirm</label>
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
                {isLoading ? "Submitting..." : "Submit application"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already applied?{" "}
              <Link href="/login?role=peer-mentor" className="font-semibold text-primary-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile background */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image src="/images/peer-mentor-hero.jpg" alt="Peer mentors" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gray-900/90" />
      </div>
    </div>
  );
}
