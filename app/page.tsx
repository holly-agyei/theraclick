"use client";

/**
 * LANDING PAGE — Full conversion-optimized marketing page.
 *
 * 12 sections: Splash → Hero → Stats → Problem → Features → How It Works
 * → Counselors & Mentors → AI Highlight → Forums → Trust → Testimonials
 * → Final CTA → Footer
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Shield,
  Clock,
  Brain,
  MessageCircle,
  Sparkles,
  Phone,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { BrainMark } from "@/components/Logo";

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function LandingPage() {
  const router = useRouter();

  const [phase, setPhase] = useState(0);
  const [skipSplash, setSkipSplash] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splash_seen") === "1") {
      setPhase(5);
      setSkipSplash(true);
      return;
    }
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => { setPhase(5); sessionStorage.setItem("splash_seen", "1"); }, 4000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const splashVisible = phase < 5;
  const splashExiting = phase === 4;
  const landed = phase >= 5;

  const stats = useInView();
  const problem = useInView();
  const features = useInView();
  const howItWorks = useInView();
  const forPros = useInView();
  const aiSection = useInView();
  const forums = useInView();
  const trust = useInView();
  const testimonials = useInView();

  const anim = (v: boolean, delay = "") =>
    `transition-all duration-700 ease-out ${delay} ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  const goldBtn =
    "group inline-flex items-center justify-center gap-2 rounded-full bg-[#F5C842] px-8 py-4 text-[15px] font-bold text-[#0D1F1D] shadow-lg shadow-[#F5C842]/25 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:bg-[#FFD95A] hover:shadow-xl active:scale-[0.97]";

  const outlineBtn =
    "group inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-[15px] font-semibold text-white transition-all duration-300 hover:border-white/60 hover:bg-white/10 active:scale-[0.97]";

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-[#0F4F47]">
      {/* ═══════════ SPLASH ═══════════ */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F4F47]
          transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${splashExiting ? "scale-[1.08] opacity-0" : splashVisible ? "scale-100 opacity-100" : "pointer-events-none scale-[1.08] opacity-0"}`}
      >
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
          <BrainMark className="h-20 w-20 md:h-24 md:w-24" />
        </div>
        <h1 className={`mt-6 text-[28px] font-bold tracking-[0.25em] text-white md:text-[34px] transition-all duration-[600ms] ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          THERACLICK
        </h1>
        <p className={`mt-4 text-[15px] font-light tracking-wide text-[#7BD8CA] transition-all duration-[600ms] ${phase >= 3 ? "opacity-100 blur-0" : "opacity-0 blur-[8px]"}`}>
          You are in the right place.
        </p>
      </div>

      {/* ═══════════ MAIN ═══════════ */}
      <div className={`transition-all duration-[800ms] ${landed ? "opacity-100" : "opacity-0"}`}>

        {/* ────────── HERO ────────── */}
        <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
          <video autoPlay muted loop playsInline preload="auto" poster="/images/student-hero.jpg" src="/videos/campus.mp4?v=3"
            className="absolute inset-0 z-0 h-full w-full object-cover scale-[1.1] blur-[3px]" />
          <div className="absolute inset-0 z-[1]" style={{
            background: "linear-gradient(180deg, rgba(10,60,52,0.90) 0%, rgba(15,79,71,0.84) 40%, rgba(10,60,52,0.94) 100%)",
          }} />

          {/* Nav */}
          <nav className={`relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20
            transition-all duration-500 delay-100 ${landed ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
            <div className="flex items-center gap-2.5">
              <BrainMark className="h-9 w-9" />
              <span className="text-lg font-bold tracking-tight text-white">Theraklick</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <button onClick={() => scrollTo("features")} className="text-[13px] font-medium text-white/70 transition-colors hover:text-white">Features</button>
              <button onClick={() => scrollTo("how-it-works")} className="text-[13px] font-medium text-white/70 transition-colors hover:text-white">How It Works</button>
              <button onClick={() => scrollTo("for-pros")} className="text-[13px] font-medium text-white/70 transition-colors hover:text-white">For Counselors</button>
              <button onClick={() => scrollTo("forums")} className="text-[13px] font-medium text-white/70 transition-colors hover:text-white">Community</button>
              <button onClick={() => router.push("/login?role=student")} className="text-[13px] font-medium text-white/70 transition-colors hover:text-white">Sign In</button>
              <button onClick={() => router.push("/signup/student")}
                className="rounded-full bg-[#F5C842] px-5 py-2 text-[13px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
                Get Started Free
              </button>
            </div>
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => router.push("/login?role=student")} className="text-[13px] font-medium text-white/70">Sign In</button>
              <button onClick={() => router.push("/signup/student")}
                className="rounded-full bg-[#F5C842] px-4 py-1.5 text-[12px] font-bold text-[#0D1F1D]">Get Started</button>
            </div>
          </nav>

          {/* Hero content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h1 className={`max-w-[800px] text-[clamp(2rem,5.5vw,4rem)] font-extrabold leading-[1.08] text-white
              transition-all duration-700 delay-200 ${landed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              Your Mental Health Journey{" "}
              <span className="text-[#F5C842]">Starts Here</span>
            </h1>
            <p className={`mt-5 max-w-[600px] text-[clamp(15px,1.8vw,18px)] leading-relaxed text-white/70
              transition-all duration-500 delay-300 ${landed ? "opacity-100" : "opacity-0"}`}>
              Theraklick connects Ghanaian students with certified counselors and peer mentors — anytime, anywhere, in the moments that matter most.
            </p>
            <div className={`mt-10 flex flex-col items-center gap-4 sm:flex-row
              transition-all duration-500 delay-[400ms] ${landed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <button onClick={() => router.push("/signup/student")} className={goldBtn}>
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
              <button onClick={() => scrollTo("how-it-works")} className={outlineBtn}>
                See How It Works
              </button>
            </div>
            <p className={`mt-6 text-[13px] font-medium text-white/40
              transition-all duration-500 delay-500 ${landed ? "opacity-100" : "opacity-0"}`}>
              Built for students. Trusted by counselors. Powered by AI.
            </p>
          </div>

          {/* Scroll hint */}
          <div className={`relative z-10 flex justify-center pb-8 transition-all duration-500 delay-700 ${landed ? "opacity-100" : "opacity-0"}`}>
            <div className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-white/20 p-1">
              <div className="h-2 w-1 animate-bounce rounded-full bg-white/50" />
            </div>
          </div>
        </section>

        {/* ────────── STATS BAR ────────── */}
        <section ref={stats.ref} className={`bg-white py-12 md:py-16 ${anim(stats.visible)}`}>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
            {[
              { value: "24/7", label: "AI Support Available" },
              { value: "Free", label: "For All Students" },
              { value: "Private", label: "Anonymous by Default" },
              { value: "Verified", label: "Certified Counselors" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold text-[#0F4F47]">{s.value}</p>
                <p className="mt-1 text-[13px] font-medium text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ────────── PROBLEM ────────── */}
        <section ref={problem.ref} className={`bg-[#0F4F47] py-20 md:py-28 ${anim(problem.visible)}`}>
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#F5C842]/70">Why Theraklick?</p>
            <h2 className="mt-4 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold leading-tight text-white">
              Students are struggling in silence.{" "}
              <span className="text-[#F5C842]">That ends now.</span>
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-center text-[15px] leading-[1.8] text-white/65">
              Too many university students in Ghana experience anxiety, depression, or overwhelming stress — yet most never seek help. The stigma is real. The waitlists are long. The campus counselor&apos;s door is often closed.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-[1.8] text-white/65">
              Theraklick was built because students deserve better. Better access, better privacy, and better support — exactly when they need it.
            </p>
          </div>
        </section>

        {/* ────────── FEATURES ────────── */}
        <section id="features" ref={features.ref} className={`bg-white py-20 md:py-28 ${anim(features.visible)}`}>
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">Everything You Need</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              One platform. Total support.
            </h2>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Sparkles, title: "AI-Powered Chat",
                  desc: "Talk to our Gemini-powered AI therapist anytime — day or night. It understands Ghana's unique student pressures, detects crisis signals, and always knows when to connect you with a real human.",
                },
                {
                  icon: BadgeCheck, title: "Certified Counselors",
                  desc: "Browse verified professional counselors, filter by specialization, check availability, and book sessions that fit your schedule. Real help, made simple.",
                },
                {
                  icon: Users, title: "Peer Mentors",
                  desc: "Sometimes you just need someone who gets it. Connect with trained peer mentors from your school who've walked the same path.",
                },
                {
                  icon: Phone, title: "Voice & Video Calls",
                  desc: "No awkward commute. No waiting rooms. Have real, face-to-face counseling sessions from the privacy of your dorm room or anywhere you feel safe.",
                },
                {
                  icon: MessageCircle, title: "Community Forums",
                  desc: "Join topic rooms on Exam Stress, Anxiety, Relationships, First Year Life, and Self Care. Share, support, and be supported — anonymously if you prefer.",
                },
                {
                  icon: Shield, title: "Your Privacy, Protected",
                  desc: "Post anonymously. Chat confidentially. Theraklick never shares your identity without your permission. You control your story.",
                },
              ].map((card) => (
                <div key={card.title}
                  className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-7 transition-all duration-300 hover:border-[#2BB5A0]/20 hover:shadow-lg hover:shadow-[#2BB5A0]/5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F4F47] text-white transition-transform duration-300 group-hover:scale-110">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-[17px] font-bold text-gray-900">{card.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.7] text-gray-500">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── HOW IT WORKS ────────── */}
        <section id="how-it-works" ref={howItWorks.ref} className={`bg-[#F8FAF9] py-20 md:py-28 ${anim(howItWorks.visible)}`}>
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">Simple by Design</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              From sign-up to support in under 2 minutes.
            </h2>
            <div className="relative mt-16 grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-8">
              <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-[2px] bg-gradient-to-r from-transparent via-[#2BB5A0]/25 to-transparent md:block" />
              {[
                {
                  step: "01", title: "Create Your Account",
                  desc: "Sign up as a student in seconds. Choose to use your name or stay completely anonymous — we'll generate a private identity like \"calmzebra42\" so no one knows it's you.",
                },
                {
                  step: "02", title: "Tell Us What You Need",
                  desc: "Browse counselors by specialization, connect with a peer mentor from your school, or start chatting with our AI — whatever feels right for right now.",
                },
                {
                  step: "03", title: "Get Real Support",
                  desc: "Book a session, join a live video call, send a voice message, or drop into the community forum. Support fits your schedule, your comfort, and your needs.",
                },
              ].map((s) => (
                <div key={s.step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[#0F4F47] shadow-xl shadow-[#0F4F47]/15">
                    <span className="text-[28px] font-extrabold text-[#F5C842]">{s.step}</span>
                  </div>
                  <h3 className="mt-6 text-[18px] font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-3 max-w-[320px] text-[14px] leading-[1.7] text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── FOR COUNSELORS & MENTORS ────────── */}
        <section id="for-pros" ref={forPros.ref} className={`bg-white py-20 md:py-28 ${anim(forPros.visible)}`}>
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">Join the Network</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              Make a real difference in students&apos; lives.
            </h2>
            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Counselors */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                  <BadgeCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[20px] font-bold text-gray-900">For Certified Counselors</h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">
                  Expand your reach beyond the physical campus. Manage your availability, accept bookings, and conduct sessions entirely online. Theraklick handles the scheduling so you can focus on what matters — your students.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Manage your schedule & availability",
                    "Real-time messaging with students",
                    "Voice & video session tools built in",
                    "Dashboard to track your impact",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14px] text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#2BB5A0]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Peer Mentors */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5C842] text-[#0D1F1D]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[20px] font-bold text-gray-900">For Peer Mentors</h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">
                  You don&apos;t need a degree to change someone&apos;s life. If you&apos;ve navigated university stress and want to give back, become a Theraklick peer mentor. We&apos;ll train you, support you, and connect you with students who need your experience.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Help students from your own school",
                    "Structured support and training",
                    "Flexible, on-your-own-time messaging",
                    "Build skills that last a lifetime",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14px] text-gray-600">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C842]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-10 text-center">
              <button onClick={() => router.push("/role-selection")}
                className="inline-flex items-center gap-2 text-[15px] font-bold text-[#0F4F47] transition-colors hover:text-[#2BB5A0]">
                Apply to Join Our Network <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ────────── AI HIGHLIGHT ────────── */}
        <section ref={aiSection.ref} className={`bg-[#0F4F47] py-20 md:py-28 ${anim(aiSection.visible)}`}>
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#F5C842]/70">Meet Your AI Companion</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-white">
              Always on. Always listening. Always safe.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-center text-[15px] leading-[1.8] text-white/65">
              Theraklick&apos;s AI chat is powered by Gemini and built specifically for the Ghanaian student experience. It understands the pressure of WASSCE results, KNUST or UG admission stress, family expectations, and the loneliness that can come with a new semester.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-[1.8] text-white/65">
              And when things get serious — when the words suggest more than stress — our system detects it and immediately surfaces crisis resources and connects you with a real counselor.
            </p>
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-3">
              {[
                "Multi-thread conversations",
                "Voice input supported",
                "Crisis detection & escalation",
                "Auto-named chat threads",
                "Available 24/7",
              ].map((pill) => (
                <span key={pill} className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-[13px] font-medium text-white/75">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── FORUMS / COMMUNITY ────────── */}
        <section id="forums" ref={forums.ref} className={`bg-white py-20 md:py-28 ${anim(forums.visible)}`}>
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">You&apos;re Not Alone</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              A community that actually understands.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-[1.7] text-gray-500">
              Theraklick&apos;s forums are a judgment-free space where students talk about the real stuff. Six dedicated rooms cover the topics that matter most to student life.
            </p>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { emoji: "💬", name: "General Support" },
                { emoji: "📚", name: "Exam Stress" },
                { emoji: "😟", name: "Anxiety & Overwhelm" },
                { emoji: "💔", name: "Relationships" },
                { emoji: "🎓", name: "First Year Struggles" },
                { emoji: "🌿", name: "Self Care & Wellness" },
              ].map((room) => (
                <div key={room.name}
                  className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50/50 p-5 text-center transition-all duration-300 hover:border-[#2BB5A0]/20 hover:shadow-md">
                  <span className="text-[28px]">{room.emoji}</span>
                  <p className="mt-2 text-[13px] font-semibold text-gray-700">{room.name}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-lg text-center text-[14px] text-gray-400">
              Post with your name or completely anonymously. React, reply, and support others — or just read and know you&apos;re not the only one feeling this way.
            </p>
          </div>
        </section>

        {/* ────────── TRUST / SAFETY ────────── */}
        <section ref={trust.ref} className={`bg-[#F8FAF9] py-20 md:py-28 ${anim(trust.visible)}`}>
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">Built Responsibly</p>
            <h2 className="mt-3 text-center text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              Your safety is our non-negotiable.
            </h2>
            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  icon: Lock, title: "Confidential by Default",
                  desc: "All conversations are private. Anonymous posting means your identity stays yours. We will never expose who you are without your explicit consent.",
                },
                {
                  icon: AlertTriangle, title: "Crisis-Ready",
                  desc: "Our AI scans for self-harm and crisis language in real time. When detected, it immediately responds with safety resources and escalates to a human counselor — because some things can't wait.",
                },
                {
                  icon: BadgeCheck, title: "Verified Professionals Only",
                  desc: "Every counselor on Theraklick goes through an approval process. No imposters. No unqualified advice. Just real, vetted mental health professionals.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F4F47]/[0.08]">
                    <item.icon className="h-6 w-6 text-[#0F4F47]" />
                  </div>
                  <h3 className="mt-5 text-[17px] font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── CTA SECTION ────────── */}
        <section ref={testimonials.ref} className={`bg-white py-20 md:py-28 ${anim(testimonials.visible)}`}>
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-[13px] font-medium uppercase tracking-[0.25em] text-[#2BB5A0]">Take the First Step</p>
            <h2 className="mt-3 text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-gray-900">
              Your wellbeing matters. Start today.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.7] text-gray-500">
              Theraklick is free, private, and built for students like you. Whether you need to talk to an AI companion at 2am or book a session with a certified counselor — support is just a click away.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button onClick={() => router.push("/signup/student")} className={goldBtn}>
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
              <button onClick={() => router.push("/login?role=student")} className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 px-8 py-4 text-[15px] font-semibold text-gray-600 transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]">
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* ────────── FOOTER ────────── */}
        <footer className="border-t border-white/10 bg-[#0A3C34] py-14">
          <div className="mx-auto max-w-6xl px-6">
            {/* Top */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
              {/* Brand */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2">
                  <BrainMark className="h-8 w-8" />
                  <span className="text-[16px] font-bold text-white">Theraklick</span>
                </div>
                <p className="mt-4 max-w-[240px] text-[13px] leading-relaxed text-white/40">
                  Mental wellness, made accessible for every Ghanaian student.
                </p>
              </div>
              {/* Links */}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-white/30">Platform</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Students", href: "/students" },
                    { label: "Counselors", href: "/counselors" },
                    { label: "Peer Mentors", href: "/mentors" },
                    { label: "Partner Portal", href: "/admin/login" },
                  ].map((l) => (
                    <button key={l.label} onClick={() => router.push(l.href)}
                      className="block text-[13px] text-white/50 transition-colors hover:text-white/80">{l.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-white/30">Support</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Help Center", href: "/help" },
                    { label: "Report an Issue", href: "/report" },
                    { label: "Contact Us", href: "/contact" },
                    { label: "Privacy Policy", href: "/privacy" },
                  ].map((l) => (
                    <button key={l.label} onClick={() => router.push(l.href)}
                      className="block text-[13px] text-white/50 transition-colors hover:text-white/80">{l.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-white/30">Community</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Forums", href: "/forums" },
                    { label: "Blog", href: "/blog" },
                    { label: "Campus Partners", href: "/partners" },
                    { label: "About Us", href: "/about" },
                  ].map((l) => (
                    <button key={l.label} onClick={() => router.push(l.href)}
                      className="block text-[13px] text-white/50 transition-colors hover:text-white/80">{l.label}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Bottom */}
            <div className="mt-12 border-t border-white/[0.06] pt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-[12px] text-white/25">
                &copy; {new Date().getFullYear()} Theraklick. Built with care for Ghana&apos;s student community. 🇬🇭
              </p>
              <div className="flex gap-4">
                <button onClick={() => router.push("/privacy")} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">Privacy Policy</button>
                <button onClick={() => router.push("/contact")} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">Contact</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
