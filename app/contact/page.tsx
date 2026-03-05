"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Clock, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { BrainMark } from "@/components/Logo";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ContactPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      if (db) {
        await addDoc(collection(db, "contactMessages"), {
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
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
        <h2 className="mt-6 text-[24px] font-bold text-gray-900">Message Sent</h2>
        <p className="mt-2 max-w-sm text-center text-[14px] text-gray-500">
          Thank you for reaching out! We&apos;ll get back to you within 24 hours.
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

      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Support</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">Contact Us</h1>
        <p className="mt-2 text-[15px] text-gray-500">Have a question, suggestion, or just want to say hi? We&apos;d love to hear from you.</p>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-5">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10">
                <Mail className="h-5 w-5 text-[#0F4F47]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">Email</p>
                <a href="mailto:support@theraclick.app" className="text-[14px] text-[#2BB5A0] underline">support@theraclick.app</a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10">
                <Clock className="h-5 w-5 text-[#0F4F47]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">Response Time</p>
                <p className="text-[14px] text-gray-500">We respond within 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10">
                <MapPin className="h-5 w-5 text-[#0F4F47]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900">Location</p>
                <p className="text-[14px] text-gray-500">Accra, Ghana 🇬🇭</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-gray-700">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
            </div>
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-gray-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
            </div>
            <div>
              <label className="mb-2 block text-[14px] font-semibold text-gray-700">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="How can we help you?"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] outline-none transition-all focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20 resize-none" />
            </div>
            <button type="submit" disabled={!name.trim() || !email.trim() || !message.trim() || submitting}
              className="w-full rounded-full bg-[#0F4F47] py-4 text-[15px] font-bold text-white transition-all hover:bg-[#1A7A6E] disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span> : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
