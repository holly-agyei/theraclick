"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, User } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const posts: Record<string, { title: string; author: string; date: string; readTime: string; category: string; content: string[] }> = {
  "burnout-before-finals": {
    title: "5 Signs You're Burning Out Before Finals",
    author: "Theraklick Team",
    date: "March 2026",
    readTime: "5 min read",
    category: "Wellness",
    content: [
      "Final exams are weeks away, and you've been grinding. But lately, something feels off. You're tired even after sleeping. Your concentration is shot. You keep staring at your textbook without reading a single line.",
      "You might be burning out — and it's more common than you think.",
      "## 1. You're exhausted no matter how much you sleep",
      "Burnout fatigue isn't about hours of sleep. It's a deep, bone-level tiredness that rest doesn't fix. Your body is telling you it's running on fumes.",
      "## 2. Everything feels pointless",
      "Assignments that once motivated you now feel meaningless. You start asking \"what's the point?\" about things you used to care about.",
      "## 3. You're withdrawing from friends",
      "Burnout makes social interaction feel like a chore. If you've been dodging calls, canceling plans, or eating alone more often, take note.",
      "## 4. Your body is acting up",
      "Headaches, stomach problems, chest tightness, frequent colds — burnout shows up physically too. Don't ignore what your body is telling you.",
      "## 5. You feel like you're failing at everything",
      "Even when you're doing okay objectively, burnout convinces you it's not enough. The self-doubt becomes overwhelming.",
      "## What to do",
      "Take a real break (not scrolling through TikTok — an actual rest). Talk to someone. If your campus has a counseling center, use it. Or try Theraklick — our AI chat is available 24/7, and you can connect with a counselor whenever you're ready.",
    ],
  },
  "talking-to-parents-about-mental-health": {
    title: "How to Talk to Your Parents About Mental Health in Ghana",
    author: "Theraklick Team",
    date: "March 2026",
    readTime: "7 min read",
    category: "Culture",
    content: [
      "In many Ghanaian homes, mental health isn't just misunderstood — it's barely discussed. \"Pray about it.\" \"You're overthinking.\" \"Your mates are managing, why can't you?\"",
      "These responses don't come from a bad place. Our parents grew up in a world where pushing through was the only option. But that doesn't mean you have to suffer in silence.",
      "## Start with the physical",
      "Instead of saying \"I think I'm depressed,\" try \"I haven't been sleeping well and it's affecting my grades.\" Parents respond better to tangible problems they can see.",
      "## Use a trusted intermediary",
      "Sometimes it's easier if an older sibling, aunt, or family friend helps you bring it up. Not everyone has to fight this battle alone.",
      "## Share resources",
      "Send them an article or a short video about student mental health in Ghana. Sometimes seeing that other families are having this conversation makes it feel less foreign.",
      "## Set boundaries with love",
      "\"I appreciate your advice, but I also need to talk to a professional. It doesn't mean your support isn't enough — it means I'm taking this seriously.\"",
      "## And if they don't understand?",
      "That's okay. You can still get help. Platforms like Theraklick give you anonymous, confidential access to counselors — no parental permission needed.",
    ],
  },
  "what-happens-in-counseling": {
    title: "What Actually Happens in a Counseling Session",
    author: "Theraklick Team",
    date: "February 2026",
    readTime: "4 min read",
    category: "Getting Started",
    content: [
      "A lot of students avoid counseling because they don't know what to expect. Will I have to talk about my childhood? Will they judge me? What if I cry?",
      "Let's clear the air.",
      "## First, you choose your counselor",
      "On Theraklick, you browse available counselors, see their specializations (anxiety, relationships, academic stress, etc.), and pick the one that feels right.",
      "## You book a session",
      "Pick a date and time that works for you. Sessions happen via text chat, voice call, or video call — whatever you're comfortable with.",
      "## The session starts with a check-in",
      "Your counselor will ask how you're doing and what brought you to counseling. There's no script — the conversation flows naturally.",
      "## You talk. They listen.",
      "A good counselor doesn't tell you what to do. They help you explore your own thoughts, understand patterns, and develop strategies that work for YOUR life.",
      "## It's confidential",
      "Nothing you say leaves the session. If you're using anonymous mode, the counselor doesn't even know your real name.",
      "## It's free",
      "On Theraklick, there's no charge for students. No hidden costs. No subscriptions.",
      "## And yes, it's okay to cry",
      "It's okay to be nervous. It's okay to not have the words. Your counselor has seen it all — and they're there to help, not judge.",
    ],
  },
  "not-weak-for-asking-help": {
    title: "You're Not Weak for Asking for Help",
    author: "Theraklick Team",
    date: "February 2026",
    readTime: "6 min read",
    category: "Mindset",
    content: [
      "\"Real men don't cry.\" \"Be strong for the family.\" \"Others have it worse.\" \"You have food and shelter — what's there to be stressed about?\"",
      "If you grew up hearing these things, you're not alone. In Ghanaian culture, strength is valued above almost everything else. And somewhere along the way, asking for help became synonymous with weakness.",
      "## But here's the truth",
      "Ignoring a problem doesn't make you strong. It makes you exhausted.",
      "Think about it this way: if you had a broken bone, would you just \"push through it\"? Of course not. You'd go to a hospital. Your mental health deserves the same care.",
      "## The stigma is real, but it's changing",
      "More Ghanaian students are talking about anxiety, depression, and burnout than ever before. Student organizations are hosting mental health weeks. Platforms like Theraklick exist specifically for this moment.",
      "## Asking for help is a skill",
      "It requires self-awareness, courage, and humility. Those are strengths, not weaknesses.",
      "## You don't have to hit rock bottom",
      "You don't need to be in crisis to talk to someone. Sometimes you just need a space to think out loud. That's what counselors and peer mentors are for.",
      "## Start small",
      "You don't have to book a full session today. Just open the AI chat. Write one sentence about how you're feeling. That's already a brave first step.",
    ],
  },
};

export default function BlogArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const post = posts[slug];

  if (!post) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6">
        <h2 className="text-[24px] font-bold text-gray-900">Article not found</h2>
        <p className="mt-2 text-[14px] text-gray-500">The article you&apos;re looking for doesn&apos;t exist.</p>
        <button onClick={() => router.push("/blog")}
          className="mt-6 rounded-full bg-[#0F4F47] px-6 py-3 text-[14px] font-bold text-white hover:bg-[#1A7A6E]">
          Back to Blog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrainMark className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900">Theraklick</span>
          </button>
          <button onClick={() => router.push("/blog")} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> All Articles
          </button>
        </div>
      </nav>

      <article className="mx-auto max-w-2xl px-6 py-16">
        <span className="inline-block rounded-full bg-[#0F4F47]/10 px-3 py-1 text-[12px] font-semibold text-[#0F4F47]">{post.category}</span>
        <h1 className="mt-4 text-[28px] font-extrabold text-gray-900 md:text-[36px] leading-tight">{post.title}</h1>
        <div className="mt-4 flex items-center gap-4 text-[13px] text-gray-400">
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.author}</span>
          <span>{post.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
        </div>

        <div className="mt-10 space-y-4 text-[15px] leading-[1.9] text-gray-600">
          {post.content.map((para, i) => {
            if (para.startsWith("## ")) {
              return <h2 key={i} className="mt-6 text-[18px] font-bold text-gray-900">{para.replace("## ", "")}</h2>;
            }
            return <p key={i}>{para}</p>;
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[18px] font-bold text-white">Need someone to talk to?</h3>
          <p className="mt-2 text-[14px] text-white/60">Theraklick gives you 24/7 access to AI chat, certified counselors, and peer mentors — all free.</p>
          <button onClick={() => router.push("/signup/student")}
            className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[#F5C842] px-6 py-3 text-[14px] font-bold text-[#0D1F1D] hover:bg-[#FFD95A]">
            Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Back */}
        <button onClick={() => router.push("/blog")}
          className="mt-8 flex items-center gap-1.5 text-[13px] font-semibold text-[#2BB5A0] hover:gap-2.5 transition-all">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to all articles
        </button>
      </article>
    </div>
  );
}
