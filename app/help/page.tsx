"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const faqs = [
  {
    category: "Account",
    questions: [
      {
        q: "How do I reset my password?",
        a: "Go to the Sign In page and click \"Forgot password?\" Enter the email address you registered with, and we'll send you a reset link. Check your spam folder if you don't see it within a few minutes.",
      },
      {
        q: "How do I verify my email?",
        a: "After signing up, we send a verification email to your registered address. Click the verification link in that email, then return to Theraklick and sign in. If you didn't receive it, you can request a new verification email from the sign-in page.",
      },
      {
        q: "Can I change my email address?",
        a: "Currently, email changes require contacting our support team at support@theraklick.app. We'll verify your identity and update your email within 24 hours.",
      },
      {
        q: "How do I delete my account?",
        a: "Send a deletion request to support@theraklick.app from your registered email. We will remove your account, profile, messages, and all associated data within 30 days.",
      },
    ],
  },
  {
    category: "Booking Sessions",
    questions: [
      {
        q: "How do I book a session with a counselor?",
        a: "Navigate to \"Talk to Counselors\" from your dashboard. Browse available counselors, tap on one to view their profile, then go to the \"Book Session\" tab. Select a date, choose an available time slot, and confirm your booking.",
      },
      {
        q: "Can I cancel or reschedule a booking?",
        a: "Yes. Go to your Bookings page from the dashboard. Find the session you want to change and tap on it. You can cancel anytime before the session starts.",
      },
      {
        q: "Are sessions really free?",
        a: "Yes. Theraklick is completely free for students. There are no hidden costs, subscriptions, or premium tiers. Counselors volunteer their time or are supported through campus partnerships.",
      },
    ],
  },
  {
    category: "Anonymous Mode",
    questions: [
      {
        q: "What is anonymous mode?",
        a: "Anonymous mode replaces your real name with a randomly generated identity (like \"calmzebra42\") across the platform. Counselors, peer mentors, and other students will only see your anonymous name. Your real identity stays completely hidden.",
      },
      {
        q: "Can I turn anonymous mode on and off?",
        a: "Yes. You can toggle anonymous mode from your Settings page at any time. When you turn it off, your real name becomes visible again in future interactions.",
      },
      {
        q: "Can counselors see my real name in anonymous mode?",
        a: "No. When anonymous mode is on, even counselors and peer mentors only see your anonymous identity. Your real name is not visible to anyone on the platform.",
      },
    ],
  },
  {
    category: "AI Chat",
    questions: [
      {
        q: "How does the AI chat work?",
        a: "Theraklick's AI chat is powered by Gemini 2.0. It's trained to understand the unique pressures Ghanaian students face — academic stress, family expectations, financial pressure, and more. You can start multiple conversation threads, use voice input, and chat 24/7. The AI provides supportive guidance and, when needed, suggests connecting with a human counselor.",
      },
      {
        q: "Is the AI chat confidential?",
        a: "Yes. Your AI conversations are stored securely and are only visible to you. They are not shared with counselors, mentors, or other users. The only exception is crisis detection — if the AI detects language suggesting self-harm, it will surface safety resources and may alert a counselor.",
      },
      {
        q: "Can the AI replace a real counselor?",
        a: "No. The AI is a wellness companion, not a licensed therapist. It's great for reflecting, venting, and getting wellness tips, but for serious mental health concerns, we always recommend connecting with one of our certified counselors.",
      },
    ],
  },
  {
    category: "Voice & Video Calls",
    questions: [
      {
        q: "How do voice and video calls work?",
        a: "Calls on Theraklick are peer-to-peer using WebRTC technology. When you're chatting with a counselor or peer mentor, tap the phone or video icon to start a call. The other person will receive an incoming call notification with the option to accept or decline.",
      },
      {
        q: "Are calls recorded?",
        a: "No. Calls are never recorded. They happen directly between you and the other person (peer-to-peer). We only store basic metadata like call duration and timestamp for your call history.",
      },
      {
        q: "What if the call quality is poor?",
        a: "Call quality depends on your internet connection. For best results, use a stable Wi-Fi connection. If calls keep dropping, try switching from video to voice-only, or use the text chat as an alternative.",
      },
    ],
  },
  {
    category: "Forums",
    questions: [
      {
        q: "How do I start a forum post?",
        a: "Go to Forums from your dashboard. Choose a topic room (like General Support, Exam Stress, or Relationships). Type your message in the input field at the bottom and tap send. You can also attach images or record voice messages.",
      },
      {
        q: "Can I post anonymously in forums?",
        a: "Yes. If you have anonymous mode enabled in your settings, all your forum posts will show your anonymous identity instead of your real name.",
      },
      {
        q: "How do I report inappropriate content?",
        a: "Use the Report Issue feature (available from your dashboard or the support page). Select \"Content\" as the issue type, describe the problem, and our moderation team will review it promptly.",
      },
    ],
  },
  {
    category: "Reporting Issues",
    questions: [
      {
        q: "How do I report a bug or issue?",
        a: "Go to the Report an Issue page (available from your dashboard or footer). Select the issue type (Bug, Safety Concern, Content, or Feature Request), describe the problem, and optionally attach a screenshot. Your report goes directly to our admin team.",
      },
      {
        q: "What happens after I submit a report?",
        a: "Your report enters our admin review queue. The team reviews all reports and updates their status: Pending → Reviewed → Resolved. If you provided your email, we may follow up for more details.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<string | null>(null);

  const filtered = faqs.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(search.toLowerCase()) ||
        q.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  return (
    <div className="min-h-[100dvh] bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrainMark className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900">Theraklick</span>
          </button>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Support</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">Help Center</h1>
        <p className="mt-2 text-[15px] text-gray-500">Find answers to common questions about Theraklick.</p>

        {/* Search */}
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search for a question..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20"
          />
        </div>

        {/* FAQ Sections */}
        <div className="mt-10 space-y-8">
          {filtered.map((cat) => (
            <div key={cat.category}>
              <h2 className="text-[18px] font-bold text-gray-900">{cat.category}</h2>
              <div className="mt-4 space-y-2">
                {cat.questions.map((faq) => {
                  const key = `${cat.category}-${faq.q}`;
                  const isOpen = openIdx === key;
                  return (
                    <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/50">
                      <button
                        onClick={() => setOpenIdx(isOpen ? null : key)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="text-[14px] font-semibold text-gray-800 pr-4">{faq.q}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 px-5 py-4">
                          <p className="text-[14px] leading-[1.7] text-gray-600">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[14px] text-gray-400 py-8">No results found. Try a different search term.</p>
          )}
        </div>

        {/* Still need help */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[20px] font-bold text-white">Still need help?</h3>
          <p className="mt-2 text-[14px] text-white/60">Our support team responds within 24 hours.</p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => router.push("/contact")}
              className="rounded-full bg-[#F5C842] px-6 py-2.5 text-[14px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
              Contact Us
            </button>
            <button onClick={() => router.push("/report")}
              className="rounded-full border border-white/30 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-white/10">
              Report an Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
