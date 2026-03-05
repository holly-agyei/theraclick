"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { BrainMark } from "@/components/Logo";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const issueTypes = [
  { value: "bug", label: "Bug / Something Broken", emoji: "🐛" },
  { value: "safety", label: "Safety Concern", emoji: "🚨" },
  { value: "content", label: "Inappropriate Content", emoji: "🚫" },
  { value: "feature", label: "Feature Request", emoji: "💡" },
  { value: "other", label: "Other", emoji: "📝" },
];

export default function ReportIssuePage() {
  const router = useRouter();
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType || !description.trim()) return;
    setSubmitting(true);
    try {
      if (db) {
        await addDoc(collection(db, "reports"), {
          userId: "public-visitor",
          userRole: "visitor",
          userName: "Public Report",
          issueType,
          description: description.trim(),
          email: email.trim() || null,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mt-6 text-[24px] font-bold text-gray-900">Report Submitted</h2>
        <p className="mt-2 max-w-sm text-center text-[14px] text-gray-500">
          Thank you for letting us know. Our team will review your report and take action. If you provided your email, we may follow up for more details.
        </p>
        <button onClick={() => router.push("/")}
          className="mt-8 rounded-full bg-[#0F4F47] px-6 py-3 text-[14px] font-bold text-white transition-all hover:bg-[#1A7A6E]">
          Back to Home
        </button>
      </div>
    );
  }

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

      <div className="mx-auto max-w-xl px-6 py-16">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Support</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900">Report an Issue</h1>
        <p className="mt-2 text-[15px] text-gray-500">Help us improve TheraClick by reporting bugs, safety concerns, or suggesting features.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {/* Issue type */}
          <div>
            <label className="mb-3 block text-[14px] font-semibold text-gray-700">What type of issue?</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {issueTypes.map((t) => (
                <button key={t.value} type="button" onClick={() => setIssueType(t.value)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[14px] font-medium transition-all
                    ${issueType === t.value ? "border-[#0F4F47] bg-[#0F4F47]/5 text-[#0F4F47]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <span className="text-[18px]">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[14px] font-semibold text-gray-700">Describe the issue</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us what happened, what you expected, and any steps to reproduce the issue..."
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20 resize-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-[14px] font-semibold text-gray-700">
              Email for follow-up <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20"
            />
          </div>

          <button type="submit" disabled={!issueType || !description.trim() || submitting}
            className="w-full rounded-full bg-[#0F4F47] py-4 text-[15px] font-bold text-white transition-all hover:bg-[#1A7A6E] disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
            ) : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
