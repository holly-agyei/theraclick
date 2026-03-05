"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, User } from "lucide-react";
import { BrainMark } from "@/components/Logo";

const posts = [
  {
    slug: "burnout-before-finals",
    title: "5 Signs You're Burning Out Before Finals",
    excerpt: "That constant exhaustion isn't laziness. Here are the warning signs of academic burnout — and what to do before it's too late.",
    author: "TheraClick Team",
    date: "March 2026",
    readTime: "5 min read",
    category: "Wellness",
    content: [
      "Final exams are weeks away, and you've been grinding. But lately, something feels off. You're tired even after sleeping. Your concentration is shot. You keep staring at your textbook without reading a single line.",
      "You might be burning out — and it's more common than you think.",
      "**1. You're exhausted no matter how much you sleep.** Burnout fatigue isn't about hours of sleep. It's a deep, bone-level tiredness that rest doesn't fix. Your body is telling you it's running on fumes.",
      "**2. Everything feels pointless.** Assignments that once motivated you now feel meaningless. You start asking \"what's the point?\" about things you used to care about.",
      "**3. You're withdrawing from friends.** Burnout makes social interaction feel like a chore. If you've been dodging calls, canceling plans, or eating alone more often, take note.",
      "**4. Your body is acting up.** Headaches, stomach problems, chest tightness, frequent colds — burnout shows up physically too. Don't ignore what your body is telling you.",
      "**5. You feel like you're failing at everything.** Even when you're doing okay objectively, burnout convinces you it's not enough. The self-doubt becomes overwhelming.",
      "**What to do:** Take a real break (not scrolling through TikTok — an actual rest). Talk to someone. If your campus has a counseling center, use it. Or try TheraClick — our AI chat is available 24/7, and you can connect with a counselor whenever you're ready.",
    ],
  },
  {
    slug: "talking-to-parents-about-mental-health",
    title: "How to Talk to Your Parents About Mental Health in Ghana",
    excerpt: "\"I'm not crazy, I just need to talk to someone.\" How to start the hardest conversation in a Ghanaian household.",
    author: "TheraClick Team",
    date: "March 2026",
    readTime: "7 min read",
    category: "Culture",
    content: [
      "In many Ghanaian homes, mental health isn't just misunderstood — it's barely discussed. \"Pray about it.\" \"You're overthinking.\" \"Your mates are managing, why can't you?\"",
      "These responses don't come from a bad place. Our parents grew up in a world where pushing through was the only option. But that doesn't mean you have to suffer in silence.",
      "**Start with the physical.** Instead of saying \"I think I'm depressed,\" try \"I haven't been sleeping well and it's affecting my grades.\" Parents respond better to tangible problems they can see.",
      "**Use a trusted intermediary.** Sometimes it's easier if an older sibling, aunt, or family friend helps you bring it up. Not everyone has to fight this battle alone.",
      "**Share resources.** Send them an article or a short video about student mental health in Ghana. Sometimes seeing that other families are having this conversation makes it feel less foreign.",
      "**Set boundaries with love.** \"I appreciate your advice, but I also need to talk to a professional. It doesn't mean your support isn't enough — it means I'm taking this seriously.\"",
      "**And if they don't understand?** That's okay. You can still get help. Platforms like TheraClick give you anonymous, confidential access to counselors — no parental permission needed.",
    ],
  },
  {
    slug: "what-happens-in-counseling",
    title: "What Actually Happens in a Counseling Session",
    excerpt: "It's not a movie scene with a leather couch and a notepad. Here's what a real session looks like on TheraClick.",
    author: "TheraClick Team",
    date: "February 2026",
    readTime: "4 min read",
    category: "Getting Started",
    content: [
      "A lot of students avoid counseling because they don't know what to expect. Will I have to talk about my childhood? Will they judge me? What if I cry?",
      "Let's clear the air.",
      "**First, you choose your counselor.** On TheraClick, you browse available counselors, see their specializations (anxiety, relationships, academic stress, etc.), and pick the one that feels right.",
      "**You book a session.** Pick a date and time that works for you. Sessions happen via text chat, voice call, or video call — whatever you're comfortable with.",
      "**The session starts with a check-in.** Your counselor will ask how you're doing and what brought you to counseling. There's no script — the conversation flows naturally.",
      "**You talk. They listen.** A good counselor doesn't tell you what to do. They help you explore your own thoughts, understand patterns, and develop strategies that work for YOUR life.",
      "**It's confidential.** Nothing you say leaves the session. If you're using anonymous mode, the counselor doesn't even know your real name.",
      "**It's free.** On TheraClick, there's no charge for students. No hidden costs. No subscriptions.",
      "**And yes, it's okay to cry.** It's okay to be nervous. It's okay to not have the words. Your counselor has seen it all — and they're there to help, not judge.",
    ],
  },
  {
    slug: "not-weak-for-asking-help",
    title: "You're Not Weak for Asking for Help",
    excerpt: "The strongest thing you can do is admit you need support. Let's talk about why so many Ghanaian students struggle with this.",
    author: "TheraClick Team",
    date: "February 2026",
    readTime: "6 min read",
    category: "Mindset",
    content: [
      "\"Real men don't cry.\" \"Be strong for the family.\" \"Others have it worse.\" \"You have food and shelter — what's there to be stressed about?\"",
      "If you grew up hearing these things, you're not alone. In Ghanaian culture, strength is valued above almost everything else. And somewhere along the way, asking for help became synonymous with weakness.",
      "**But here's the truth:** ignoring a problem doesn't make you strong. It makes you exhausted.",
      "Think about it this way: if you had a broken bone, would you just \"push through it\"? Of course not. You'd go to a hospital. Your mental health deserves the same care.",
      "**The stigma is real, but it's changing.** More Ghanaian students are talking about anxiety, depression, and burnout than ever before. Student organizations are hosting mental health weeks. Platforms like TheraClick exist specifically for this moment.",
      "**Asking for help is a skill.** It requires self-awareness, courage, and humility. Those are strengths, not weaknesses.",
      "**You don't have to hit rock bottom.** You don't need to be in crisis to talk to someone. Sometimes you just need a space to think out loud. That's what counselors and peer mentors are for.",
      "**Start small.** You don't have to book a full session today. Just open the AI chat. Write one sentence about how you're feeling. That's already a brave first step.",
    ],
  },
];

export default function BlogPage() {
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

      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Community</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">Blog</h1>
        <p className="mt-2 text-[15px] text-gray-500">Mental health articles tailored for Ghanaian students.</p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <button key={post.slug} onClick={() => router.push(`/blog/${post.slug}`)}
              className="group rounded-2xl border border-gray-100 bg-white p-6 text-left transition-all hover:shadow-lg hover:shadow-gray-100">
              <span className="inline-block rounded-full bg-[#0F4F47]/10 px-3 py-1 text-[12px] font-semibold text-[#0F4F47]">{post.category}</span>
              <h2 className="mt-4 text-[18px] font-bold text-gray-900 group-hover:text-[#0F4F47] transition-colors">{post.title}</h2>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-500 line-clamp-2">{post.excerpt}</p>
              <div className="mt-4 flex items-center gap-4 text-[12px] text-gray-400">
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.author}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2BB5A0] group-hover:gap-2 transition-all">
                Read article <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
