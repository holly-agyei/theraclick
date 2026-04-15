"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageSquare, Shield, Users } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const topicRooms = [
  { name: "General Support", desc: "A safe space to talk about anything on your mind. No topic too big or too small.", emoji: "💬", color: "bg-blue-50 border-blue-100" },
  { name: "Exam Stress", desc: "Struggling with test anxiety, procrastination, or academic pressure? You're not alone.", emoji: "📚", color: "bg-orange-50 border-orange-100" },
  { name: "Relationships", desc: "Friendships, family, romantic partners — navigating relationships can be tough. Let's talk.", emoji: "❤️", color: "bg-pink-50 border-pink-100" },
  { name: "Career Anxiety", desc: "Worried about life after university? NYSC? Job market? This room gets it.", emoji: "💼", color: "bg-purple-50 border-purple-100" },
  { name: "Family Pressure", desc: "Cultural expectations, financial pressures, parental demands — share and find support.", emoji: "🏠", color: "bg-amber-50 border-amber-100" },
  { name: "Peer Stories", desc: "Real stories from real students. Read how others cope, grow, and find their way.", emoji: "✨", color: "bg-green-50 border-green-100" },
];

export default function ForumsPreviewPage() {
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
          COMMUNITY
        </span>
        <h1 className="mt-4 text-[32px] font-extrabold text-white md:text-[44px] max-w-2xl mx-auto leading-tight">
          You&apos;re not alone in this.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/60">
          Join anonymous, moderated forums where Ghanaian students support each other through shared challenges.
        </p>
        <button onClick={() => router.push("/signup/student")}
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
          Join to Participate <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Topic rooms */}
        <h2 className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Topic Rooms</h2>
        <h3 className="mt-2 text-center text-[24px] font-bold text-gray-900">6 Spaces, One Community</h3>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topicRooms.map((room) => (
            <div key={room.name} className={`rounded-2xl border p-6 ${room.color}`}>
              <span className="text-[28px]">{room.emoji}</span>
              <h4 className="mt-3 text-[16px] font-bold text-gray-900">{room.name}</h4>
              <p className="mt-2 text-[13px] leading-[1.6] text-gray-500">{room.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-16 space-y-6">
          <h3 className="text-[20px] font-bold text-gray-900">How Forums Work</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: MessageSquare, title: "Post & Reply", desc: "Share your thoughts, ask questions, or offer advice. Text, images, and voice messages supported." },
              { icon: Shield, title: "Stay Anonymous", desc: "With anonymous mode on, no one knows who you are. Your real identity is never exposed." },
              { icon: Users, title: "Moderated & Safe", desc: "Counselors and admins monitor forums to ensure a supportive, respectful environment." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
                <f.icon className="h-6 w-6 text-[#0F4F47]" />
                <h4 className="mt-3 text-[15px] font-bold text-gray-900">{f.title}</h4>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[22px] font-bold text-white">Ready to join the conversation?</h3>
          <p className="mt-2 text-[14px] text-white/60">Create a free account and start connecting with students who understand.</p>
          <button onClick={() => router.push("/signup/student")}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-8 py-3.5 text-[15px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
            Join Theraklick <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
