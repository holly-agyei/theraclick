"use client";

import { useState } from "react";
import { X, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const issueTypes = [
  "Bug or technical issue",
  "Inappropriate content",
  "Safety concern",
  "Feature request",
  "Other",
];

interface Props {
  onClose: () => void;
}

export function ReportIssueModal({ onClose }: Props) {
  const { profile } = useAuth();
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !issueType) return;
    setSubmitting(true);

    try {
      if (db) {
        await addDoc(collection(db, "reports"), {
          userId: profile?.uid || "anonymous",
          userRole: profile?.role || "unknown",
          userName: profile?.fullName || profile?.anonymousId || "Anonymous",
          issueType,
          description: description.trim(),
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setSubmitted(true);
    } catch (e) {
      console.error("Error submitting report:", e);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1F1D] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[#2BB5A0]" />
            <h3 className="text-lg font-semibold text-white">Report submitted</h3>
            <p className="mt-2 text-sm text-[#6B8C89]">
              Thank you for letting us know. Our team will look into this.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-full bg-[#2BB5A0] px-6 py-2.5 text-sm font-medium text-white
                transition-all hover:bg-[#2BB5A0]/80"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Report an issue</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#6B8C89] hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Issue Type */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                What kind of issue?
              </label>
              <div className="flex flex-wrap gap-2">
                {issueTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setIssueType(type)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all
                      ${issueType === type
                        ? "border-[#2BB5A0] bg-[#2BB5A0]/15 text-[#2BB5A0]"
                        : "border-white/[0.12] text-white/60 hover:border-white/20 hover:text-white"
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what happened..."
                rows={4}
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-3
                  text-sm text-white placeholder-[#6B8C89] resize-none
                  focus:border-[#2BB5A0] focus:outline-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!issueType || !description.trim() || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2BB5A0] py-3
                text-sm font-medium text-white transition-all
                hover:bg-[#2BB5A0]/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
