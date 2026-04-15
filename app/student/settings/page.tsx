"use client";

import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import {
  User, EyeOff, LogOut, Save, ChevronRight, Camera, Lock, Mail,
  Bell, BellOff, MessageSquare, Users, Eye, Moon, Sun, Type,
  HelpCircle, Flag, Phone, Trash2, AlertTriangle, Shield, Download,
  CheckCircle, Circle, ExternalLink,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db, auth as firebaseAuth } from "@/lib/firebase";
import { sendPasswordResetEmail, updateEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 3);
  return `${visible}${"*".repeat(Math.max(local.length - 3, 3))}@${domain}`;
}

function capitalize(name: string) {
  return name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

type TextSize = "small" | "medium" | "large";

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
        enabled ? "bg-[#2BB5A0]" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function SettingsRow({ icon: Icon, iconBg, iconColor, label, description, right, onClick, destructive }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${onClick ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" : ""}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium ${destructive ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>{label}</p>
        {description && <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>}
      </div>
      {right || (onClick && <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />)}
    </Wrapper>
  );
}

export default function StudentSettingsPage() {
  const { profile, setStudentAnonymousEnabled, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState(profile?.student?.school || "");
  const [educationLevel, setEducationLevel] = useState(profile?.student?.educationLevel || "");

  // All settings that persist to Firestore under users/{uid}.preferences
  const [whoCanMessage, setWhoCanMessage] = useState<"everyone" | "counselors" | "nobody">("everyone");
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [forumReplies, setForumReplies] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load saved preferences from Firestore on mount
  useEffect(() => {
    async function loadPrefs() {
      if (!profile || !db) return;
      try {
        const snap = await getDoc(doc(db, "users", profile.uid));
        const p = snap.data()?.preferences;
        if (p) {
          if (p.whoCanMessage) setWhoCanMessage(p.whoCanMessage);
          if (p.showOnlineStatus !== undefined) setShowOnlineStatus(p.showOnlineStatus);
          if (p.sessionReminders !== undefined) setSessionReminders(p.sessionReminders);
          if (p.newMessages !== undefined) setNewMessages(p.newMessages);
          if (p.forumReplies !== undefined) setForumReplies(p.forumReplies);
          if (p.emailNotifications !== undefined) setEmailNotifications(p.emailNotifications);
          if (p.textSize) setTextSize(p.textSize);
        }
      } catch { /* first time — use defaults */ }
      setPrefsLoaded(true);
    }
    void loadPrefs();
  }, [profile]);

  const savePref = useCallback(async (key: string, value: unknown) => {
    if (!profile || !db) return;
    try { await updateDoc(doc(db, "users", profile.uid), { [`preferences.${key}`]: value }); }
    catch (e) { console.warn("Pref save failed:", e); }
  }, [profile]);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [confirmPasswordVal, setConfirmPasswordVal] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Change email state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isStudent = profile?.role === "student";
  const anonEnabled = !!profile?.anonymousEnabled;
  const anonId = profile?.anonymousId;

  const initials = profile?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "S";
  const displayName = profile?.fullName ? capitalize(profile.fullName) : "—";
  const maskedEmail = profile?.email ? maskEmail(profile.email) : "—";

  // Profile completion
  const completion = useMemo(() => {
    if (!profile) return { percent: 0, missing: "Sign in to get started" };
    let score = 0;
    const total = 5;
    const items: { done: boolean; label: string }[] = [
      { done: !!profile.fullName, label: "Add your name" },
      { done: !!profile.email, label: "Verify email" },
      { done: !!profile.student?.school, label: "Add your school" },
      { done: !!profile.student?.educationLevel, label: "Set education level" },
      { done: !!profile.anonymousId, label: "Set up anonymous mode" },
    ];
    items.forEach((i) => { if (i.done) score++; });
    const next = items.find((i) => !i.done);
    return { percent: Math.round((score / total) * 100), missing: next?.label || "", items };
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile || !db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        "student.school": school.trim(),
        "student.educationLevel": educationLevel.trim(),
      });
      setEditingProfile(false);
    } catch { alert("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPasswordStatus(null);
    if (!newPasswordVal || !confirmPasswordVal) { setPasswordStatus({ type: "error", msg: "Fill in all fields." }); return; }
    if (newPasswordVal.length < 6) { setPasswordStatus({ type: "error", msg: "Password must be at least 6 characters." }); return; }
    if (newPasswordVal !== confirmPasswordVal) { setPasswordStatus({ type: "error", msg: "Passwords don't match." }); return; }

    const user = firebaseAuth?.currentUser;
    if (!user || !user.email) { setPasswordStatus({ type: "error", msg: "Not signed in." }); return; }

    setPasswordSaving(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPasswordVal);
      setPasswordStatus({ type: "success", msg: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPasswordVal("");
      setConfirmPasswordVal("");
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPasswordStatus({ type: "error", msg: "Current password is incorrect." });
      } else if (code === "auth/too-many-requests") {
        setPasswordStatus({ type: "error", msg: "Too many attempts. Try again later." });
      } else {
        setPasswordStatus({ type: "error", msg: "Failed to update password. Try again." });
      }
    } finally { setPasswordSaving(false); }
  };

  const handleChangeEmail = async () => {
    setEmailStatus(null);
    if (!newEmail.trim() || !emailPassword) { setEmailStatus({ type: "error", msg: "Fill in all fields." }); return; }
    if (!newEmail.includes("@")) { setEmailStatus({ type: "error", msg: "Enter a valid email address." }); return; }

    const user = firebaseAuth?.currentUser;
    if (!user || !user.email) { setEmailStatus({ type: "error", msg: "Not signed in." }); return; }

    setEmailSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail.trim());
      // Update Firestore profile too
      if (db && profile) {
        await updateDoc(doc(db, "users", profile.uid), { email: newEmail.trim() });
      }
      setEmailStatus({ type: "success", msg: "Email updated successfully!" });
      setNewEmail("");
      setEmailPassword("");
      setTimeout(() => setShowEmailForm(false), 2000);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setEmailStatus({ type: "error", msg: "Password is incorrect." });
      } else if (code === "auth/email-already-in-use") {
        setEmailStatus({ type: "error", msg: "This email is already in use." });
      } else if (code === "auth/requires-recent-login") {
        setEmailStatus({ type: "error", msg: "Please sign out and sign back in, then try again." });
      } else {
        setEmailStatus({ type: "error", msg: "Failed to update email. Try again." });
      }
    } finally { setEmailSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!profile || !db) return;
    if (!confirm("This will permanently delete your account and all data. This cannot be undone. Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "users", profile.uid));
      await logout();
    } catch { alert("Failed to delete account. Please contact support."); }
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gray-50/80 dark:bg-gray-900/80">
        <div className="px-4 py-6 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-lg">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#2BB5A0]">Account</p>
            <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

            {/* ── Profile Card ── */}
            <div className="mb-2 rounded-2xl bg-white dark:bg-gray-950 p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-[#0F4F47] flex items-center justify-center text-lg font-bold text-white ring-2 ring-[#2BB5A0] ring-offset-2 dark:ring-offset-gray-950">
                    {initials}
                  </div>
                  <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50">
                    <Camera className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-gray-900 dark:text-gray-100 truncate capitalize">{displayName}</p>
                  <p className="text-[13px] text-gray-400 truncate">{maskedEmail}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{profile?.role || "Student"}</p>
                </div>
              </div>

              {/* Completion bar */}
              {completion.percent < 100 && (
                <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">Profile {completion.percent}% complete</p>
                    <p className="text-[11px] text-[#2BB5A0]">{completion.missing}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-[#2BB5A0] transition-all" style={{ width: `${completion.percent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* ── PROFILE Section ── */}
            {isStudent && (
              <>
                <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Profile</p>
                <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  <SettingsRow icon={User} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-500"
                    label="Edit Profile" description={`${profile?.student?.school || "No school"} · ${profile?.student?.educationLevel || "No level"}`}
                    onClick={() => setEditingProfile(!editingProfile)}
                    right={<ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${editingProfile ? "rotate-90" : ""}`} />} />

                  {editingProfile && (
                    <div className="px-4 py-4">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">School</label>
                          <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Your school name"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">Education Level</label>
                          <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-[14px] text-gray-900 dark:text-gray-100 focus:border-[#2BB5A0] focus:outline-none">
                            <option value="">Select level</option>
                            <option value="Level 100">Level 100</option>
                            <option value="Level 200">Level 200</option>
                            <option value="Level 300">Level 300</option>
                            <option value="Level 400">Level 400</option>
                            <option value="Postgraduate">Postgraduate</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleSaveProfile} disabled={saving}
                            className="rounded-xl bg-[#0F4F47] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1A7A6E] disabled:opacity-50">
                            <Save className="mr-1.5 inline h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
                          </button>
                          <button onClick={() => { setEditingProfile(false); setSchool(profile?.student?.school || ""); setEducationLevel(profile?.student?.educationLevel || ""); }}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Change Password */}
                  <SettingsRow icon={Lock} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-500"
                    label="Change Password" onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordStatus(null); }}
                    right={<ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showPasswordForm ? "rotate-90" : ""}`} />} />

                  {showPasswordForm && (
                    <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">Current password</label>
                          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">New password</label>
                          <Input type="password" value={newPasswordVal} onChange={(e) => setNewPasswordVal(e.target.value)}
                            placeholder="At least 6 characters"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">Confirm new password</label>
                          <Input type="password" value={confirmPasswordVal} onChange={(e) => setConfirmPasswordVal(e.target.value)}
                            placeholder="Re-enter new password"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        {passwordStatus && (
                          <p className={`text-[13px] font-medium ${passwordStatus.type === "success" ? "text-[#2BB5A0]" : "text-red-500"}`}>
                            {passwordStatus.msg}
                          </p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleChangePassword} disabled={passwordSaving}
                            className="rounded-xl bg-[#0F4F47] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1A7A6E] disabled:opacity-50">
                            {passwordSaving ? "Updating..." : "Update Password"}
                          </button>
                          <button onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPasswordVal(""); setConfirmPasswordVal(""); setPasswordStatus(null); }}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Change Email */}
                  <SettingsRow icon={Mail} iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-500"
                    label="Change Email" description={maskedEmail}
                    onClick={() => { setShowEmailForm(!showEmailForm); setEmailStatus(null); }}
                    right={<ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showEmailForm ? "rotate-90" : ""}`} />} />

                  {showEmailForm && (
                    <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">New email address</label>
                          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="your-new-email@example.com"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[12px] font-medium text-gray-500">Confirm your password</label>
                          <Input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)}
                            placeholder="Enter your current password to confirm"
                            className="border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[14px]" />
                        </div>
                        {emailStatus && (
                          <p className={`text-[13px] font-medium ${emailStatus.type === "success" ? "text-[#2BB5A0]" : "text-red-500"}`}>
                            {emailStatus.msg}
                          </p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleChangeEmail} disabled={emailSaving}
                            className="rounded-xl bg-[#0F4F47] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#1A7A6E] disabled:opacity-50">
                            {emailSaving ? "Updating..." : "Update Email"}
                          </button>
                          <button onClick={() => { setShowEmailForm(false); setNewEmail(""); setEmailPassword(""); setEmailStatus(null); }}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── PRIVACY Section ── */}
            {isStudent && (
              <>
                <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Privacy</p>
                <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                        <EyeOff className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Anonymous Mode</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">
                          {anonEnabled
                            ? <>Posting as <span className="font-semibold text-[#2BB5A0]">{anonId}</span> in forums and chats</>
                            : "When on, your real name is hidden in forums and chats"}
                        </p>
                      </div>
                      <Toggle enabled={anonEnabled} onChange={() => void setStudentAnonymousEnabled(!anonEnabled)} />
                    </div>
                  </div>

                  <div className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                        <MessageSquare className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Who can message me</p>
                      </div>
                      <select value={whoCanMessage} onChange={(e) => { const v = e.target.value as typeof whoCanMessage; setWhoCanMessage(v); savePref("whoCanMessage", v); }}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5 text-[12px] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#2BB5A0]">
                        <option value="everyone">Everyone</option>
                        <option value="counselors">Counselors only</option>
                        <option value="nobody">Nobody</option>
                      </select>
                    </div>
                  </div>

                  <SettingsRow icon={Eye} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-500"
                    label="Show online status" description="Let others see when you're active"
                    right={<Toggle enabled={showOnlineStatus} onChange={() => { const v = !showOnlineStatus; setShowOnlineStatus(v); savePref("showOnlineStatus", v); }} />} />
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS Section ── */}
            <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Notifications</p>
            <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              <SettingsRow icon={Bell} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-500"
                label="Session reminders" description="Get notified before your sessions"
                right={<Toggle enabled={sessionReminders} onChange={() => { const v = !sessionReminders; setSessionReminders(v); savePref("sessionReminders", v); }} />} />
              <SettingsRow icon={MessageSquare} iconBg="bg-sky-100 dark:bg-sky-900/30" iconColor="text-sky-500"
                label="New messages" description="Direct messages and chat"
                right={<Toggle enabled={newMessages} onChange={() => { const v = !newMessages; setNewMessages(v); savePref("newMessages", v); }} />} />
              <SettingsRow icon={Users} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-500"
                label="Forum replies" description="When someone replies to your posts"
                right={<Toggle enabled={forumReplies} onChange={() => { const v = !forumReplies; setForumReplies(v); savePref("forumReplies", v); }} />} />
              <SettingsRow icon={Mail} iconBg="bg-rose-100 dark:bg-rose-900/30" iconColor="text-rose-400"
                label="Email notifications" description="Receive updates via email"
                right={<Toggle enabled={emailNotifications} onChange={() => { const v = !emailNotifications; setEmailNotifications(v); savePref("emailNotifications", v); }} />} />
            </div>

            {/* ── APPEARANCE Section ── */}
            <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Appearance</p>
            <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {theme === "dark" ? <Moon className="h-5 w-5 text-gray-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Dark mode</p>
                  </div>
                  <Toggle enabled={theme === "dark"} onChange={() => setTheme(theme === "dark" ? "light" : "dark")} />
                </div>
              </div>
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                    <Type className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Text size</p>
                  </div>
                  <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                    {(["small", "medium", "large"] as TextSize[]).map((s) => (
                      <button key={s} onClick={() => { setTextSize(s); savePref("textSize", s); }}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${
                          textSize === s ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-400"}`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── SUPPORT Section ── */}
            <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Support</p>
            <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              <SettingsRow icon={HelpCircle} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-500"
                label="Help Center" description="FAQs and guides" onClick={() => router.push("/help")} />
              <SettingsRow icon={Flag} iconBg="bg-orange-100 dark:bg-orange-900/30" iconColor="text-orange-500"
                label="Report an Issue" description="Bugs, safety, or content" onClick={() => router.push("/report")} />
              <SettingsRow icon={Phone} iconBg="bg-green-100 dark:bg-green-900/30" iconColor="text-green-500"
                label="Contact Support" description="Get in touch with our team" onClick={() => router.push("/contact")} />
            </div>

            {/* ── DATA & PRIVACY Section ── */}
            <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Data &amp; Privacy</p>
            <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              <SettingsRow icon={Download} iconBg="bg-teal-100 dark:bg-teal-900/30" iconColor="text-teal-500"
                label="Download my data" description="Export all your Theraklick data" onClick={() => alert("Data export will be emailed to you within 24 hours.")} />
              <SettingsRow icon={Shield} iconBg="bg-indigo-100 dark:bg-indigo-900/30" iconColor="text-indigo-500"
                label="Privacy Policy" onClick={() => router.push("/privacy")}
                right={<ExternalLink className="h-4 w-4 text-gray-400" />} />
            </div>

            {/* ── ACCOUNT Section ── */}
            <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Account</p>
            <div className="rounded-2xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
              <SettingsRow icon={LogOut} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-500"
                label="Logout" destructive onClick={() => void logout()} />
            </div>

            {/* ── DANGER ZONE ── */}
            <div className="mt-6 rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-200 dark:border-red-900/50">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Danger Zone</p>
              </div>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-100/50 dark:hover:bg-red-950/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-red-500">Delete Account</p>
                    <p className="text-[12px] text-red-400/80 mt-0.5">Permanently remove your account and all data</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-red-400" />
                </button>
              ) : (
                <div className="px-4 py-4">
                  <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">Are you sure?</p>
                  <p className="mt-1 text-[12px] text-red-500/80">This will permanently delete your account, messages, bookings, and all associated data. This action cannot be undone.</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={handleDeleteAccount}
                      className="rounded-xl bg-red-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-red-600">
                      Yes, delete my account
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Version footer */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-gray-400">
              <span>Theraklick v1.0</span>
              <span className="text-gray-300">·</span>
              <button onClick={() => router.push("/blog")} className="text-[#2BB5A0] hover:underline">What&apos;s new</button>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
