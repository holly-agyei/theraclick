"use client";

import { useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Calendar, ArrowRight } from "lucide-react";

export default function BookingPage() {
  const router = useRouter();

  return (
    <LayoutWrapper>
      <div className="bg-white dark:bg-gray-950">
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 md:px-8 md:py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">Book a Session</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 md:text-lg">
            Schedule time with a counselor or peer mentor
          </p>
        </div>

        <div className="flex flex-col items-center justify-center px-4 py-20 md:px-8">
          <Calendar className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Book directly from a counselor&apos;s profile
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            Browse our verified counselors, view their availability, and book a session directly from their profile page.
          </p>
          <button
            onClick={() => router.push("/student/counselors")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700"
          >
            Browse Counselors <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </LayoutWrapper>
  );
}

