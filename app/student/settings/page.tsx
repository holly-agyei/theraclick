"use client";

import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { User, EyeOff, LogOut, Save, ChevronRight } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudentSettingsPage() {
  const { profile, setStudentAnonymousEnabled, logout } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState(profile?.student?.school || "");
  const [educationLevel, setEducationLevel] = useState(
    profile?.student?.educationLevel || ""
  );

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
      setEditingProfile(false);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    profile?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2) || "S";

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gray-50/80">
        <div className="px-4 py-6 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-lg">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

            {/* Profile Card */}
            <div className="mb-2 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-green-600 flex items-center justify-center text-lg font-bold text-white ring-2 ring-green-500 ring-offset-2">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {profile?.fullName || "—"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {profile?.email || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Section */}
            {isStudent && (
              <>
                <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Profile
                </p>
                <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                      <User className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="flex-1 text-left text-sm font-medium text-gray-900">
                      Edit Profile
                    </p>
                    <ChevronRight
                      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                        editingProfile ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {editingProfile && (
                    <div className="border-t border-gray-100 px-4 py-4">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-500">
                            School
                          </label>
                          <Input
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            placeholder="Your school name"
                            className="border-gray-200 bg-gray-50 text-gray-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-500">
                            Education Level
                          </label>
                          <Input
                            value={educationLevel}
                            onChange={(e) => setEducationLevel(e.target.value)}
                            placeholder="e.g., High School, University"
                            className="border-gray-200 bg-gray-50 text-gray-900 text-sm"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingProfile(false);
                              setSchool(profile?.student?.school || "");
                              setEducationLevel(
                                profile?.student?.educationLevel || ""
                              );
                            }}
                            variant="outline"
                            size="sm"
                            className="border-gray-200 text-gray-600"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Privacy Section */}
            {isStudent && (
              <>
                <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Privacy
                </p>
                <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100">
                      <EyeOff className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Anonymous Mode
                      </p>
                      {anonEnabled && anonId && (
                        <p className="text-xs text-gray-400 truncate">
                          ID: <span className="font-mono">{anonId}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        void setStudentAnonymousEnabled(!anonEnabled)
                      }
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                        anonEnabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                          anonEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Account Section */}
            <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account
            </p>
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => void logout()}
                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <p className="flex-1 text-left text-sm font-medium text-gray-900">
                  Logout
                </p>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">
              TheraClick v1.0
            </p>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
