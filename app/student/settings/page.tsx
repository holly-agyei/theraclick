"use client";

import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { Shield, User, EyeOff, LogOut, Save, School, GraduationCap } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudentSettingsPage() {
  const { profile, setStudentAnonymousEnabled, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState(profile?.student?.school || "");
  const [educationLevel, setEducationLevel] = useState(profile?.student?.educationLevel || "");

  const isStudent = profile?.role === "student";
  const anonEnabled = !!profile?.anonymousEnabled;
  const anonId = profile?.anonymousId;

  const handleSaveProfile = async () => {
    if (!profile || !db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        student: {
          school: school.trim(),
          educationLevel: educationLevel.trim(),
          schoolEmail: profile.student?.schoolEmail || null,
        },
      });
      setEditing(false);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="mt-2 text-gray-400">Manage your account and preferences</p>
            </div>

            {/* Account Info */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Account Information</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="mt-1 text-white">{profile?.fullName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="mt-1 text-white">{profile?.email || "—"}</p>
                </div>
              </div>
            </div>

            {/* Student Profile */}
            {isStudent && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/20 p-2">
                      <School className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Student Profile</h2>
                  </div>
                  {!editing && (
                    <Button
                      onClick={() => setEditing(true)}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/10"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">School</label>
                      <Input
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="Your school name"
                        className="border-white/10 bg-white/5 text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">Education Level</label>
                      <Input
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        placeholder="e.g., High School, University"
                        className="border-white/10 bg-white/5 text-white"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setSchool(profile?.student?.school || "");
                          setEducationLevel(profile?.student?.educationLevel || "");
                        }}
                        variant="outline"
                        className="border-white/10 text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">School</p>
                      <p className="mt-1 text-white">{profile?.student?.school || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Education Level</p>
                      <p className="mt-1 text-white">{profile?.student?.educationLevel || "Not set"}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Anonymous Mode */}
            {isStudent && (
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2">
                    <EyeOff className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Anonymous Mode</h2>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                  When enabled, your display name becomes an anonymous ID across the app. Your real identity remains private.
                </p>
                <div className="mb-4 rounded-lg bg-white/5 p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className={anonEnabled ? "text-emerald-400" : "text-gray-400"}>
                      {anonEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  {anonEnabled && anonId && (
                    <p className="mt-2 text-sm text-gray-300">
                      <span className="font-semibold">Your Anonymous ID:</span>{" "}
                      <span className="font-mono text-emerald-400">{anonId}</span>
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => void setStudentAnonymousEnabled(!anonEnabled)}
                  className={`w-full sm:w-auto ${
                    anonEnabled
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  }`}
                >
                  {anonEnabled ? "Turn Off Anonymous Mode" : "Turn On Anonymous Mode"}
                </Button>
              </div>
            )}

            {/* Logout */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/20 p-2">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">Sign Out</h2>
                  <p className="mt-1 text-sm text-gray-400">You'll be returned to the home screen</p>
                </div>
                <Button
                  onClick={() => void logout()}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}

