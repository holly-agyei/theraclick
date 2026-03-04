"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, EyeOff } from "lucide-react";
import { useAuth } from "@/context/auth";

export default function AnonymousSetupPage() {
  const [anonymousEnabled, setAnonymousEnabled] = useState(true);
  const router = useRouter();
  const { profile, loading, setStudentAnonymousEnabled } = useAuth();

  const handleContinue = async () => {
    if (!profile?.role) return router.replace("/login");
    if (profile.role !== "student") return router.replace(`/${profile.role}/dashboard`);

    await setStudentAnonymousEnabled(anonymousEnabled);
    router.push("/student/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary-100 p-4 md:p-5">
            <Shield className="h-8 w-8 text-primary-600 md:h-10 md:w-10" />
          </div>
        </div>
        <h1 className="mb-3 text-center text-3xl font-bold text-gray-900 md:text-4xl">
          Choose how you want to appear
        </h1>
        <p className="mb-12 text-center text-lg text-gray-600 md:text-xl">
          Your privacy is our priority
        </p>

        {/* Anonymous Mode Toggle */}
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900 md:text-lg">Anonymous Mode</p>
              <p className="mt-1 text-sm text-gray-600 md:text-base">
                When enabled, you’ll be shown as an anonymous ID across the app. You can change this later in Settings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnonymousEnabled((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                anonymousEnabled ? "bg-primary-500" : "bg-gray-300"
              }`}
              aria-label="Toggle anonymous mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  anonymousEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <EyeOff className="h-4 w-4 text-primary-700" />
            <span>
              Anonymous Mode is <span className="font-semibold">{anonymousEnabled ? "ON" : "OFF"}</span>
            </span>
          </div>
        </div>

        {/* Privacy Info Box */}
        <div className="mb-8 rounded-lg bg-primary-50 p-5 md:p-6">
          <div className="flex gap-4">
            <Lock className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 md:h-7 md:w-7" />
            <p className="text-sm text-gray-700 md:text-base lg:text-lg">
              Your real account stays private. Anonymous Mode controls what other people see inside the app.
            </p>
          </div>
        </div>

        {/* Privacy Rights */}
        <Card className="mb-8 border-gray-200">
          <CardContent className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary-600 md:h-7 md:w-7" />
              <h3 className="text-lg font-semibold text-gray-900 md:text-xl">Your Privacy Rights</h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-600 md:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-400"></span>
                <span>All chats are encrypted end-to-end</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-400"></span>
                <span>Your data is never sold or shared</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-400"></span>
                <span>You can delete your account anytime</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-400"></span>
                <span>Professional counselors follow strict confidentiality</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-full bg-primary-400 text-white hover:bg-primary-500 disabled:opacity-50 md:w-auto md:px-12 md:text-lg"
            onClick={handleContinue}
            disabled={loading || !profile}
          >
            Continue Safely
          </Button>
        </div>
      </div>
    </div>
  );
}

