"use client";

/**
 * VERIFY EMAIL — shown after signup.
 *
 * WHY: We send a verification email on signup and sign the user out.
 * This page tells them to check their inbox before they can log in.
 * No auth required — this is a public page.
 */

import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#0D1F1D] to-[#142E2B] px-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2BB5A0]/10">
          <Mail className="h-8 w-8 text-[#2BB5A0]" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="mt-3 text-[#8FACA8] leading-relaxed">
          We sent a verification link to your email.
          Open it and click the link to activate your account.
        </p>

        {/* Tips */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left">
          <p className="text-sm font-medium text-white/80 mb-2">Can&apos;t find it?</p>
          <ul className="space-y-1.5 text-sm text-[#8FACA8]">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the right email</li>
            <li>Wait a minute — it may take a moment to arrive</li>
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2BB5A0] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#249E8B] active:scale-95"
        >
          Go to Sign In
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-4 text-xs text-[#6B8C89]">
          You can close this page. Once verified, sign in normally.
        </p>
      </div>
    </div>
  );
}
