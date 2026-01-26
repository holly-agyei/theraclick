"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { ArrowLeft, GraduationCap, HeartHandshake, UserCheck } from "lucide-react";

type Role = "student" | "peer-mentor" | "counselor";

const roleConfig = {
  student: {
    title: "Student Sign In",
    subtitle: "Access your support dashboard",
    image: "/images/student-hero.jpg",
    icon: GraduationCap,
    createLink: "/signup/student",
    createLabel: "Create account",
  },
  "peer-mentor": {
    title: "Peer Mentor Sign In",
    subtitle: "Continue supporting students",
    image: "/images/peer-mentor-hero.jpg",
    icon: HeartHandshake,
    createLink: "/apply/peer-mentor",
    createLabel: "Apply as mentor",
  },
  counselor: {
    title: "Counselor Sign In",
    subtitle: "Access your counselor dashboard",
    image: "/images/counselor-hero.jpg",
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

  const config = useMemo(() => roleConfig[role], [role]);
  const Icon = config.icon;

  // Redirect when profile is loaded after login
  useEffect(() => {
    if (hasLoggedIn && !authLoading && profile && profile.role) {
      // Check if user should be redirected based on status
      if (profile.status === "pending") {
        router.push("/pending-approval");
      } else if (profile.status === "disabled") {
        setError("Your account has been disabled. Please contact support.");
        setHasLoggedIn(false);
        setIsLoading(false);
      } else if (profile.role === role) {
        // Only redirect if the role matches what they're trying to log in as
        router.push(role === "student" ? "/student/dashboard" : `/${role}/dashboard`);
      } else {
        // Role mismatch - redirect to their actual role dashboard
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
      // Don't set isLoading to false here - let useEffect handle redirect
      // The loading state will be cleared when redirect happens
    } catch (err: any) {
      setError(err?.message || "Could not sign in. Please try again.");
      setIsLoading(false);
      setHasLoggedIn(false);
    }
  };

  return (
    <div className="flex h-screen min-h-[600px] overflow-hidden">
      {/* Left - Hero Image */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src={config.image}
          alt={config.title}
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900/50" />
        
        {/* Back to home */}
        <Link href="/" className="absolute left-6 top-6 z-10 flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Right - Dark Glass Panel */}
      <div className="relative flex w-full flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 lg:w-1/2">
        {/* Floating orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center overflow-y-auto px-6 py-8 lg:px-12">
          {/* Mobile back */}
          <Link href="/" className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white lg:hidden">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>

          <div className="mx-auto w-full max-w-sm">
            {/* Role badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2">
              <Icon className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-medium text-gray-300">
                {role === "student" ? "Student" : role === "peer-mentor" ? "Peer Mentor" : "Counselor"}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">{config.title}</h1>
            <p className="mt-2 text-gray-400">{config.subtitle}</p>

            {!isFirebaseBacked && (
              <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm font-semibold text-yellow-300">Demo mode</p>
                <p className="mt-1 text-sm text-yellow-300/70">
                  Firebase isn't configured. Add keys in `.env.local`.
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  type="password"
                  autoComplete="current-password"
                  className="border-gray-700 bg-gray-800/50 text-white placeholder:text-gray-500 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              {error && <p className="text-sm font-medium text-red-400">{error}</p>}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary-500 text-white hover:bg-primary-400"
                disabled={!isFirebaseBacked || isLoading || !email.trim() || !password.trim()}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-500">Don't have an account? </span>
              <Link href={config.createLink} className="text-sm font-semibold text-primary-400 hover:underline">
                {config.createLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile background */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image src={config.image} alt={config.title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gray-900/90" />
      </div>
    </div>
  );
}
