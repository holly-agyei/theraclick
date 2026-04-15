"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Heart, Clock, MessageSquare, Shield, Award } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const benefits = [
  { icon: Heart, title: "Make a Real Impact", desc: "Help fellow students navigate challenges you understand firsthand — from exam stress to family pressure." },
  { icon: Award, title: "Leadership Experience", desc: "Build mentoring, communication, and crisis-awareness skills that strengthen your CV and personal growth." },
  { icon: MessageSquare, title: "Flexible Communication", desc: "Chat with students via text, voice, or video. Work around your own academic schedule." },
  { icon: Shield, title: "Crisis Training", desc: "Learn to recognize signs of distress and escalate appropriately. You're supported by real counselors." },
  { icon: Clock, title: "Your Schedule", desc: "Set your own availability. Even a few hours a week makes a difference." },
];

const eligibility = [
  "Currently enrolled at a Ghanaian university",
  "In good academic standing (Level 200+)",
  "Strong empathy and active listening skills",
  "Commitment of at least 3–5 hours per week",
  "Willingness to complete our mentor training program",
  "No prior counseling experience required",
];

const steps = [
  { step: "1", title: "Apply Online", desc: "Share your motivation, experience with peer support, and availability. Takes about 5 minutes." },
  { step: "2", title: "Training", desc: "Complete our online training covering active listening, crisis identification, boundaries, and platform tools." },
  { step: "3", title: "Start Mentoring", desc: "Set your profile live, and students can start reaching out to you for support and guidance." },
];

export default function PeerMentorsPage() {
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
          FOR PEER MENTORS
        </span>
        <h1 className="mt-4 text-[32px] font-extrabold text-white md:text-[44px] max-w-2xl mx-auto leading-tight">
          You&apos;ve been through it. Now help others get through it.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/60">
          Become a trained peer mentor and support fellow students navigating university life. No counseling degree needed — just empathy and commitment.
        </p>
        <button onClick={() => router.push("/apply/peer-mentor")}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
          Apply as Peer Mentor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Process */}
        <h2 className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Getting Started</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">How It Works</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4F47] text-[18px] font-bold text-white">{s.step}</div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{s.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Eligibility */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8">
          <h3 className="text-[20px] font-bold text-gray-900">Eligibility</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {eligibility.map((r) => (
              <div key={r} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#2BB5A0]" />
                <span className="text-[14px] text-gray-600">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What you get */}
        <h2 className="mt-16 text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">What&apos;s In It For You</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">Benefits of Mentoring</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                <b.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{b.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Time commitment */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8">
          <h3 className="text-[20px] font-bold text-gray-900">Time Commitment</h3>
          <p className="mt-3 text-[14px] leading-[1.7] text-gray-600">
            We ask for a minimum of <strong>3–5 hours per week</strong>, but you set your own schedule. Some mentors do mornings before lectures, others prefer evenings. The training program takes about 4 hours total and can be completed at your own pace. You&apos;re never alone — our team of certified counselors is always available for guidance.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[22px] font-bold text-white">Ready to support your peers?</h3>
          <p className="mt-2 text-[14px] text-white/60">Applications take 5 minutes. Training is provided. You&apos;ll be making an impact in no time.</p>
          <button onClick={() => router.push("/apply/peer-mentor")}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
            Apply Now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
