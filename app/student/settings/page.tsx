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
        <div className="min-h-screen bg-[#F0FDF4]">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-2 text-gray-500">Manage your account and preferences</p>
            </div>

            {/* Account Info */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="mt-1 text-gray-900">{profile?.fullName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="mt-1 text-gray-900">{profile?.email || "—"}</p>
                </div>
              </div>
            </div>

            {/* Student Profile */}
            {isStudent && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2">
                      <School className="h-5 w-5 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Student Profile</h2>
                  </div>
                  {!editing && (
                    <Button
                      onClick={() => setEditing(true)}
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">School</label>
                      <Input
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="Your school name"
                        className="border-gray-200 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Education Level</label>
                      <Input
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        placeholder="e.g., High School, University"
                        className="border-gray-200 bg-white text-gray-900"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 text-white"
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
                        className="border-gray-200 text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">School</p>
                      <p className="mt-1 text-gray-900">{profile?.student?.school || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Education Level</p>
                      <p className="mt-1 text-gray-900">{profile?.student?.educationLevel || "Not set"}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Anonymous Mode */}
            {isStudent && (
              <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <EyeOff className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Anonymous Mode</h2>
                </div>
                <p className="mb-4 text-sm text-gray-500">
                  When enabled, your display name becomes an anonymous ID across the app. Your real identity remains private.
                </p>
                <div className="mb-4 rounded-lg bg-white border border-gray-100 p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className={anonEnabled ? "text-green-600" : "text-gray-500"}>
                      {anonEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  {anonEnabled && anonId && (
                    <p className="mt-2 text-sm text-gray-700">
                      <span className="font-semibold">Your Anonymous ID:</span>{" "}
                      <span className="font-mono text-green-600">{anonId}</span>
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => void setStudentAnonymousEnabled(!anonEnabled)}
                  className={`w-full sm:w-auto ${
                    anonEnabled
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {anonEnabled ? "Turn Off Anonymous Mode" : "Turn On Anonymous Mode"}
                </Button>
              </div>
            )}

            {/* Logout */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">Sign Out</h2>
                  <p className="mt-1 text-sm text-gray-500">You'll be returned to the home screen</p>
                </div>
                <Button
                  onClick={() => void logout()}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
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

