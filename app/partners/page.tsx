"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, GraduationCap, Users, Shield, BarChart3 } from "lucide-react";
import { BrainMark } from "@/components/Logo";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const partnerSchools = [
  "University of Ghana (UG)",
  "KNUST",
  "University of Cape Coast (UCC)",
  "University of Education, Winneba (UEW)",
  "University for Development Studies (UDS)",
  "Ashesi University",
  "GIMPA",
  "Central University",
];

const benefits = [
  { icon: Users, title: "Bulk Student Access", desc: "Give your entire student body free access to counseling, AI wellness tools, and peer mentoring." },
  { icon: Shield, title: "Professional Network", desc: "Connect your campus counselors with our verified network for collaboration and overflow support." },
  { icon: BarChart3, title: "Wellness Analytics", desc: "Anonymized reports showing student wellness trends, peak stress periods, and resource utilization." },
  { icon: GraduationCap, title: "Student Success", desc: "Research shows students with mental health support have 23% higher retention and better academic outcomes." },
];

export default function CampusPartnersPage() {
  const router = useRouter();
  const [school, setSchool] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school.trim() || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      if (db) {
        await addDoc(collection(db, "partnerInquiries"), {
          school: school.trim(),
          name: name.trim(),
          role: role.trim(),
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

      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#2BB5A0]">Community</p>
        <h1 className="mt-2 text-[32px] font-extrabold text-gray-900 md:text-[40px]">Campus Partners</h1>
        <p className="mt-2 text-[15px] text-gray-500 max-w-2xl">
          We partner with universities across Ghana to bring professional mental health support directly to students. No infrastructure costs. No waiting lists.
        </p>

        {/* Current partners */}
        <div className="mt-12">
          <h2 className="text-[18px] font-bold text-gray-900">Partner Institutions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {partnerSchools.map((s) => (
              <span key={s} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] font-medium text-gray-600">
                🎓 {s}
              </span>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-14">
          <h2 className="text-[18px] font-bold text-gray-900">Why Partner With Theraklick?</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F4F47] text-white">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[16px] font-bold text-gray-900">{b.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-gray-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inquiry form */}
        <div className="mt-14 rounded-2xl border border-gray-100 bg-gray-50/30 p-8" id="inquiry">
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-[20px] font-bold text-gray-900">Inquiry Submitted!</h3>
              <p className="mt-2 text-[14px] text-gray-500">We&apos;ll be in touch within 48 hours to discuss partnership opportunities.</p>
            </div>
          ) : (
            <>
              <h2 className="text-[20px] font-bold text-gray-900">Partner With Us</h2>
              <p className="mt-2 text-[14px] text-gray-500">Fill out the form below and our team will reach out to discuss how Theraklick can support your institution.</p>
              <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-gray-700">Institution Name</label>
                  <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="University of Ghana"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
                </div>
                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-gray-700">Your Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Ama Mensah"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
                </div>
                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-gray-700">Role / Title</label>
                  <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director of Student Affairs"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
                </div>
                <div>
                  <label className="mb-2 block text-[14px] font-semibold text-gray-700">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ama@ug.edu.gh"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[14px] font-semibold text-gray-700">
                    Additional Details <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Tell us about your student body size, existing counseling services, or specific needs..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-[#2BB5A0] focus:ring-2 focus:ring-[#2BB5A0]/20 resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={!school.trim() || !name.trim() || !email.trim() || submitting}
                    className="w-full rounded-full bg-[#0F4F47] py-4 text-[15px] font-bold text-white transition-all hover:bg-[#1A7A6E] disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span> : "Submit Partnership Inquiry"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
