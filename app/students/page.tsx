"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Calendar, MessageSquare, Shield, Users, Video } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const features = [
  { icon: Bot, title: "AI Wellness Chat", desc: "24/7 access to a Gemini-powered AI trained to understand Ghanaian student challenges. Talk about exam stress, relationships, finances, or anything weighing on you." },
  { icon: MessageSquare, title: "Professional Counselors", desc: "Book sessions with certified counselors via text, voice, or video call. Browse by specialization and choose who you're comfortable with." },
  { icon: Users, title: "Peer Mentors", desc: "Connect with trained student mentors who've been where you are. Sometimes the best support comes from someone who truly gets it." },
  { icon: Calendar, title: "Easy Booking", desc: "See counselor availability in real-time, pick a date and time that works for you, and get reminded before your session." },
  { icon: Shield, title: "Anonymous Mode", desc: "Use the platform with a randomly generated identity. No one sees your real name — not counselors, not mentors, not other students." },
  { icon: Video, title: "Voice & Video Calls", desc: "Secure, peer-to-peer calls that are never recorded. Switch between text, voice, and video during any conversation." },
];

export default function StudentsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrainMark className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900">TheraClick</span>
          </button>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0F4F47] to-[#0A3A34] px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-[#F5C842]">
          FOR STUDENTS
        </span>
        <h1 className="mt-4 text-[32px] font-extrabold text-white md:text-[44px] max-w-2xl mx-auto leading-tight">
          Your mental health matters. We made getting help easy.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/60">
          AI chat, certified counselors, peer mentors, anonymous forums — all free, all confidential, all built for you.
        </p>
        <button onClick={() => router.push("/signup/student")}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
          Create Free Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* How it works */}
        <h2 className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Getting Started</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">How It Works</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { step: "1", title: "Sign Up Free", desc: "Create your account in under 60 seconds. Just your name, email, school, and education level." },
            { step: "2", title: "Choose Your Support", desc: "Browse counselors, connect with peer mentors, or start an AI chat. Whatever feels right." },
            { step: "3", title: "Get Help Privately", desc: "Every conversation is confidential. Enable anonymous mode for an extra layer of privacy." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0F4F47] text-[18px] font-bold text-white">{s.step}</div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{s.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <h2 className="mt-20 text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Everything You Get</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">Features Built for Students</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-[16px] font-bold text-gray-900">{f.title}</h4>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Community */}
        <div className="mt-16 rounded-2xl bg-gray-50 p-8">
          <h3 className="text-[20px] font-bold text-gray-900">Student Community Forums</h3>
          <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">
            Join topic rooms for General Support, Exam Stress, Relationships, Career Anxiety, Family Pressure, and Peer Stories. Share anonymously, support each other, and feel less alone.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[22px] font-bold text-white">Ready to feel supported?</h3>
          <p className="mt-2 text-[14px] text-white/60">It&apos;s 100% free. No credit card. No hidden fees. Ever.</p>
          <button onClick={() => router.push("/signup/student")}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
            Get Started Now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
