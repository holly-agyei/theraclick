"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield, Eye, Heart, Users } from "lucide-react";
import { BrainMark } from "@/components/Logo";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <BrainMark className="h-8 w-8" />
            <span className="text-lg font-bold text-gray-900">TheraClick</span>
          </button>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Mission */}
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">About Us</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">
          Mental wellness, made accessible for every Ghanaian student.
        </h1>

        <div className="mt-10 space-y-8 text-[15px] leading-[1.8] text-gray-600">
          <section>
            <h2 className="text-[20px] font-bold text-gray-900">Our Story</h2>
            <p className="mt-3">
              TheraClick was born from a simple observation: too many university students in Ghana are struggling with their mental health, and too few are getting help. The stigma, the long waitlists, the lack of accessible resources — it all adds up to a system that fails the people who need it most.
            </p>
            <p className="mt-3">
              We set out to build something different. A platform that meets students where they are — on their phones, in their dorms, between lectures, at 2am during exam season. A place where getting support isn&apos;t a sign of weakness, but a sign of strength.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">The Problem We&apos;re Solving</h2>
            <p className="mt-3">
              Research shows that 1 in 4 university students in Ghana experiences anxiety, depression, or overwhelming stress. Yet most never seek help. Campus counseling centers are understaffed. Students fear being judged. The cultural expectation to &ldquo;just push through&rdquo; is strong.
            </p>
            <p className="mt-3">
              TheraClick bridges this gap by combining professional counseling, trained peer support, and AI-powered wellness tools into one private, accessible, and completely free platform.
            </p>
          </section>
        </div>

        {/* Values */}
        <div className="mt-16">
          <h2 className="text-[20px] font-bold text-gray-900">Our Values</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { icon: Shield, title: "Privacy First", desc: "Every feature is designed with your confidentiality in mind. Anonymous mode, encrypted conversations, and zero data selling." },
              { icon: Eye, title: "Radical Access", desc: "24/7 availability. No waitlists. No hidden fees. If you need support, you can get it right now." },
              { icon: Heart, title: "Safety Always", desc: "Real-time crisis detection, verified professionals only, and moderated community spaces." },
              { icon: Users, title: "Community Power", desc: "Peer mentors, student forums, and shared experiences — because healing doesn't happen in isolation." },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[16px] font-bold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mt-16">
          <h2 className="text-[20px] font-bold text-gray-900">Built in Ghana, for Ghana</h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-gray-600">
            TheraClick is built by a team that understands the Ghanaian student experience firsthand. We&apos;re not importing a foreign wellness model — we&apos;re building one that respects our culture, our communities, and our unique challenges.
          </p>
          <p className="mt-3 text-[15px] leading-[1.8] text-gray-600">
            Based in Accra, we work closely with university counseling departments, student organizations, and mental health professionals to ensure TheraClick delivers real, meaningful support.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-[#0F4F47] p-8 text-center">
          <h3 className="text-[20px] font-bold text-white">Join the movement.</h3>
          <p className="mt-2 text-[14px] text-white/60">Whether as a student, counselor, or campus partner — there&apos;s a place for you.</p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => router.push("/signup/student")}
              className="group flex items-center gap-2 rounded-full bg-[#F5C842] px-6 py-2.5 text-[14px] font-bold text-[#0D1F1D] transition-all hover:bg-[#FFD95A]">
              Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => router.push("/partners")}
              className="rounded-full border border-white/30 px-6 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-white/10">
              Partner With Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
