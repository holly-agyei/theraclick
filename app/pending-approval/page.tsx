"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Clock } from "lucide-react";
import { useAuth } from "@/context/auth";

export default function PendingApprovalPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    // If user is not pending, redirect to appropriate dashboard
    if (profile?.status === "active" && profile?.role) {
      router.replace(`/${profile.role}/dashboard`);
    } else if (profile?.status === "disabled") {
      router.replace("/login");
    }
  }, [profile, loading, router]);

  // Show loading while checking status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // If status is not pending, don't render (redirect will happen)
  if (profile?.status !== "pending") {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50/40 via-white to-white px-4 py-12">
      <div className="w-full max-w-xl">
        <Card className="border-gray-200 shadow-lg shadow-gray-100">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-100 p-3">
                <Clock className="h-6 w-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Application received</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Your account is waiting for admin approval. You’ll be able to access your dashboard once approved.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-5">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary-700" />
                <p className="text-sm text-gray-700">
                  This keeps students safe and prevents role mixing. If you think this is a mistake, contact the admin team.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className="flex-1">
                <Button className="w-full" size="lg">
                  Back to sign in
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full" size="lg" variant="outline">
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

