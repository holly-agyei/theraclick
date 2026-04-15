"use client";

/**
 * SIGN UP — Role selection screen.
 * Same design system as login: AuthLeftPanel + white card.
 * Three role cards route to individual signup/apply forms.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, HeartHandshake, UserCheck, ArrowRight } from "lucide-react";
import { AuthLeftPanel } from "@/components/AuthLeftPanel";

const roles = [
  {
    id: "student",
    label: "Student",
    description: "Get confidential support from AI, peer mentors, and licensed counselors.",
    icon: GraduationCap,
    href: "/signup/student",
    color: "bg-[#2BB5A0]",
    lightBg: "bg-[#2BB5A0]/10",
    lightText: "text-[#2BB5A0]",
    badge: "Most popular",
  },
  {
    id: "counselor",
    label: "Counselor",
    description: "Provide professional counseling to students across Ghana. Requires approval.",
    icon: UserCheck,
    href: "/apply/counselor",
    color: "bg-[#0F4F47]",
    lightBg: "bg-[#0F4F47]/10",
    lightText: "text-[#0F4F47]",
    badge: "Requires approval",
  },
  {
    id: "peer-mentor",
    label: "Peer Mentor",
    description: "Support fellow students with shared experiences and empathetic guidance.",
    icon: HeartHandshake,
    href: "/apply/peer-mentor",
    color: "bg-[#7C3AED]",
    lightBg: "bg-[#7C3AED]/10",
    lightText: "text-[#7C3AED]",
    badge: "Requires approval",
  },
];

export default function SignupPage() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, []);

  const s = (ms: number) =>
    `transition-all duration-500 delay-[${ms}ms] ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`;

  return (
    <div className="auth-page-wrapper flex min-h-[100dvh] flex-col lg:flex-row">
      <AuthLeftPanel
        entered={entered}
        headline={"Join thousands of\nGhanaian students."}
      />

      {/* White card */}
      <div
        className={`auth-right-panel relative z-10 flex flex-1 flex-col -mt-6 rounded-t-[28px] bg-white px-6 py-8
          shadow-2xl shadow-black/5
          transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:mt-0 lg:rounded-none lg:px-10 lg:py-8 lg:shadow-none
          ${entered
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "translate-y-[60px] opacity-0 lg:translate-y-0 lg:translate-x-[60px]"}`}
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h1 className={`text-2xl font-bold tracking-tight text-[#0D1F1D] lg:text-3xl ${s(200)}`}>
            Create your account
          </h1>
          <p className={`mt-2 text-[15px] text-[#6B8C89] ${s(280)}`}>
            Choose how you want to use Theraklick
          </p>

          {/* Role cards */}
          <div className="mt-8 space-y-4">
            {roles.map((role, i) => {
              const Icon = role.icon;
              return (
                <Link
                  key={role.id}
                  href={role.href}
                  className={`group relative flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5
                    shadow-sm transition-all duration-300
                    hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5
                    active:scale-[0.98] ${s(340 + i * 80)}`}
                >
                  {/* Icon circle */}
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${role.lightBg}`}>
                    <Icon className={`h-6 w-6 ${role.lightText}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-[#0D1F1D]">{role.label}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        role.id === "student"
                          ? "bg-[#2BB5A0]/10 text-[#2BB5A0]"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {role.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#6B8C89]">
                      {role.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-gray-300 transition-all group-hover:text-[#2BB5A0] group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>

          {/* Sign in link */}
          <p className={`mt-8 text-center text-sm text-[#6B8C89] ${s(600)}`}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#2BB5A0] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
