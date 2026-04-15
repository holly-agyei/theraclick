"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Calendar, MessageSquare, BarChart3, Shield, Users } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const tools = [
  { icon: MessageSquare, title: "Flexible Communication", desc: "Connect with students via text chat, voice calls, or video calls. Use whichever format the session calls for." },
  { icon: Calendar, title: "Smart Scheduling", desc: "Set your availability, and students book slots that work for both of you. No back-and-forth coordination needed." },
  { icon: BarChart3, title: "Session Management", desc: "Track your upcoming sessions, past conversations, and student progress all in one dashboard." },
  { icon: Shield, title: "Crisis Support System", desc: "Our AI flags potential crisis situations and surfaces resources immediately, so you're never caught off guard." },
  { icon: Users, title: "Peer Network", desc: "Connect with other counselors on the platform for collaboration, case consultation, and professional development." },
];

const requirements = [
  "Licensed or certified mental health professional",
  "Degree in counseling, psychology, social work, or related field",
  "Experience working with young adults (18–30)",
  "Strong written and verbal communication skills",
  "Commitment to confidentiality and ethical standards",
  "Comfortable with technology and virtual sessions",
];

const steps = [
  { step: "1", title: "Apply Online", desc: "Fill out our application with your credentials, experience, and specializations. Takes about 10 minutes." },
  { step: "2", title: "Verification", desc: "Our admin team reviews your credentials and verifies your professional status. Usually within 3–5 business days." },
  { step: "3", title: "Onboarding", desc: "Once approved, set up your profile, availability, and start connecting with students who need your expertise." },
];

export default function CounselorsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrainMark className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900">Theraklick</span>
          </button>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0F4F47] to-[#0A3A34] px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-[#F5C842]">
          FOR COUNSELORS
        </span>
        <h1 className="mt-4 text-[32px] font-extrabold text-white md:text-[44px] max-w-2xl mx-auto leading-tight">
          Make a real difference in students&apos; lives.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/60">
          Join a verified network of professionals supporting Ghanaian university students with their mental health. Flexible schedule. Meaningful work.
        </p>
        <button onClick={() => router.push("/apply/counselor")}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
          Apply as Counselor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* How approval works */}
        <h2 className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Getting Started</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">How the Approval Process Works</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4F47] text-[18px] font-bold text-white">{s.step}</div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{s.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8">
          <h3 className="text-[20px] font-bold text-gray-900">Requirements</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {requirements.map((r) => (
              <div key={r} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#2BB5A0]" />
                <span className="text-[14px] text-gray-600">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <h2 className="mt-16 text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Your Toolkit</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">Tools You&apos;ll Have Access To</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {tools.map((t) => (
            <div key={t.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                <t.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{t.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[22px] font-bold text-white">Ready to help students thrive?</h3>
          <p className="mt-2 text-[14px] text-white/60">Your expertise can make a real difference. Applications are reviewed within 3–5 days.</p>
          <button onClick={() => router.push("/apply/counselor")}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
            Apply Now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
