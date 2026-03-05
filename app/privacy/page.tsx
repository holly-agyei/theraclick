"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrainMark } from "@/components/Logo";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Nav */}
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
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Legal</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">Privacy Policy</h1>
        <p className="mt-2 text-[14px] text-gray-400">Last updated: March 2026</p>

        <div className="mt-12 space-y-10 text-[15px] leading-[1.8] text-gray-600">
          <section>
            <h2 className="text-[20px] font-bold text-gray-900">1. Introduction</h2>
            <p className="mt-3">
              TheraClick (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a mental wellness platform built for Ghanaian university students. We take your privacy extremely seriously. This policy explains what data we collect, how we use it, and your rights regarding your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">2. Data We Collect</h2>
            <p className="mt-3">We collect only what&apos;s necessary to provide you with support:</p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li><strong>Account information:</strong> Full name, email address, education level, school name, and role (student, counselor, or peer mentor).</li>
              <li><strong>Profile data:</strong> Specialization (for counselors/mentors), availability, and optional anonymous display name.</li>
              <li><strong>Messages:</strong> Direct messages between you and counselors/mentors, forum posts, and AI chat conversations.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, and session timestamps — to improve the platform.</li>
              <li><strong>Voice/video:</strong> Call metadata (duration, timestamp) but <strong>not</strong> recordings. Calls are peer-to-peer and not stored on our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">3. How We Store Your Data</h2>
            <p className="mt-3">
              Your data is stored securely using <strong>Google Firebase</strong> (Firestore, Authentication, and Cloud Storage). Firebase provides enterprise-grade security including encryption at rest and in transit. Our servers are hosted by Google Cloud Platform with data centers that comply with international security standards.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">4. Anonymous Mode</h2>
            <p className="mt-3">
              TheraClick offers an <strong>anonymous mode</strong> for students. When enabled, your real name is replaced with a randomly generated identity (e.g., &ldquo;calmzebra42&rdquo;) across the platform. Counselors and peer mentors will only see your anonymous name. Your real identity remains hidden and is never shared without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">5. Data Sharing</h2>
            <p className="mt-3">
              <strong>We do not sell, rent, or share your personal data with third parties.</strong> Your information is only accessible to:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>You (your own data)</li>
              <li>Your assigned counselor or peer mentor (only the data needed for your sessions)</li>
              <li>Platform administrators (for moderation and safety, with strict access controls)</li>
            </ul>
            <p className="mt-3">
              We use Google&apos;s Gemini AI for our chat feature. Conversations sent to Gemini are processed to generate responses but are <strong>not used to train AI models</strong> and are not stored by Google.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">6. Crisis Detection</h2>
            <p className="mt-3">
              Our AI monitors conversations for language indicating self-harm or crisis situations. When detected, the system immediately provides safety resources and may escalate to a human counselor. This is done to protect your safety and is the <strong>only case</strong> where your conversation may be reviewed without prior consent.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">7. Your Rights</h2>
            <p className="mt-3">Under the Ghana Data Protection Act, 2012 (Act 843) and applicable data protection laws, you have the right to:</p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li><strong>Access</strong> your personal data at any time through your account settings.</li>
              <li><strong>Correct</strong> inaccurate information in your profile.</li>
              <li><strong>Delete</strong> your account and all associated data by contacting us.</li>
              <li><strong>Withdraw consent</strong> for data processing at any time.</li>
              <li><strong>Port</strong> your data — request a copy of your information in a readable format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">8. Account Deletion</h2>
            <p className="mt-3">
              You can request complete account deletion by emailing <a href="mailto:support@theraclick.app" className="text-[#2BB5A0] underline">support@theraclick.app</a>. Upon request, we will delete your account, profile data, message history, and all associated records within 30 days. Some anonymized, aggregated data may be retained for platform improvement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">9. Cookies & Local Storage</h2>
            <p className="mt-3">
              We use browser local storage to persist your theme preference and session state. We do not use third-party tracking cookies. Firebase may use cookies for authentication purposes.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">10. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of TheraClick after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-gray-900">11. Contact Us</h2>
            <p className="mt-3">
              For any privacy-related questions or data requests, contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{" "}
              <a href="mailto:support@theraclick.app" className="text-[#2BB5A0] underline">support@theraclick.app</a>
            </p>
            <p className="mt-1">
              <strong>Location:</strong> Accra, Ghana
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
