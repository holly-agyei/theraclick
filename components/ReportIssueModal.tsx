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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report submitted</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Thank you for letting us know. Our team will look into this.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-full bg-green-600 px-6 py-2.5 text-sm font-medium text-white
                transition-all hover:bg-green-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report an issue</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Issue Type */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                What kind of issue?
              </label>
              <div className="flex flex-wrap gap-2">
                {issueTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setIssueType(type)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all
                      ${issueType === type
                        ? "border-green-600 bg-green-50 text-green-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900"
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what happened..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3
                  text-sm text-gray-900 placeholder-gray-400 resize-none
                  focus:border-green-600 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!issueType || !description.trim() || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 py-3
                text-sm font-medium text-white transition-all
                hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
