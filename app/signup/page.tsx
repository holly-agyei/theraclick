"use client";

import Link from "next/link";

export default function SignupPage() {
  // Legacy route kept for compatibility. New flows:
  // - Student signup: /signup/student
  // - Applications: /apply/peer-mentor, /apply/counselor
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign up</h1>
        <p className="mt-2 text-sm text-gray-600">
          We’ve updated the signup flow to support real student accounts and approvals for mentors/counselors.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link className="text-primary-700 font-semibold hover:underline" href="/signup/student">
            Create student account →
          </Link>
          <Link className="text-primary-700 font-semibold hover:underline" href="/apply/peer-mentor">
            Apply as peer mentor →
          </Link>
          <Link className="text-primary-700 font-semibold hover:underline" href="/apply/counselor">
            Apply as counselor →
          </Link>
          <Link className="text-gray-600 hover:underline" href="/login">
            Already have an account? Sign in
            </Link>
        </div>
      </div>
    </div>
  );
}
