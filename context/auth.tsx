"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, firebaseIsReady } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, onSnapshot } from "firebase/firestore";

export type UserRole = "student" | "peer-mentor" | "counselor";
export type AccountStatus = "active" | "pending" | "disabled";

export type UserProfile = {
  uid: string;
  role: UserRole | null;
  status: AccountStatus;

  // Real identity (required for all roles; peer/counselor must always use real identity)
  fullName: string | null;
  email: string | null;

  // Student-only anonymous mode (display layer)
  anonymousEnabled: boolean;
  anonymousId: string | null;

  // Student profile
  student?: {
    schoolEmail: string | null;
    educationLevel: string | null;
    school: string | null;
  };

  // Applications (peer mentors / counselors)
  application?: {
    specialization: string | null;
    about: string | null;
  };

  // Profile picture
  avatar?: string | null;
  profilePicture?: string | null;
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupStudent: (input: {
    fullName: string;
    email: string;
    schoolEmail: string;
    educationLevel: string;
    school: string;
    password: string;
  }) => Promise<void>;
  applyForRole: (input: {
    role: "peer-mentor" | "counselor";
    fullName: string;
    email: string;
    specialization: string;
    about: string;
    password: string;
  }) => Promise<void>;
  setStudentAnonymousEnabled: (enabled: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isFirebaseBacked: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_KEY = "theraclick.session.v1";
type LocalSession = {
  uid: string;
  role: UserRole | null;
  status: AccountStatus;
  fullName: string | null;
  email: string | null;
  anonymousEnabled: boolean;
  anonymousId: string | null;
};

function randomUid() {
  // Good enough for local-only demo mode.
  return `local_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function generateAnonymousId() {
  const adjectives = ["calm", "quiet", "brave", "gentle", "kind", "steady", "soft", "bright"];
  const animals = ["zebra", "gazelle", "lion", "dove", "panda", "otter", "turtle", "falcon"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)]!;
  const b = animals[Math.floor(Math.random() * animals.length)]!;
  const tail = Math.random().toString(36).slice(2, 4);
  return `${a}${b}${tail}`;
}

function readLocalSession(): LocalSession {
  if (typeof window === "undefined") {
    return {
      uid: "local_ssr",
      role: null,
      status: "active",
      fullName: null,
      email: null,
      anonymousEnabled: true,
      anonymousId: "anon",
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LocalSession;
  } catch {
    // ignore
  }
  const fresh: LocalSession = {
    uid: randomUid(),
    role: null,
    status: "active",
    fullName: null,
    email: null,
    anonymousEnabled: true,
    anonymousId: generateAnonymousId(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(fresh));
  return fresh;
}

function writeLocalSession(next: LocalSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

async function ensureFirestoreProfile(uid: string) {
  if (!firebaseIsReady || !db) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        createdAt: serverTimestamp(),
        role: null,
        status: "active",
        fullName: null,
        email: null,
        anonymousEnabled: false,
        anonymousId: null,
        student: {
          schoolEmail: null,
          educationLevel: null,
          school: null,
        },
        application: {
          specialization: null,
          about: null,
        },
      },
      { merge: true }
    );
  }
  const snap2 = await getDoc(ref);
  const d = snap2.data() as any;
  const profile: UserProfile = {
    uid,
    role: (d?.role ?? null) as UserRole | null,
    status: (d?.status ?? "active") as AccountStatus,
    fullName: (d?.fullName ?? null) as string | null,
    email: (d?.email ?? null) as string | null,
    anonymousEnabled: !!d?.anonymousEnabled,
    anonymousId: (d?.anonymousId ?? null) as string | null,
    student: d?.student
      ? {
          schoolEmail: (d.student.schoolEmail ?? null) as string | null,
          educationLevel: (d.student.educationLevel ?? null) as string | null,
          school: (d.student.school ?? null) as string | null,
        }
      : undefined,
    application: d?.application
      ? {
          specialization: (d.application.specialization ?? null) as string | null,
          about: (d.application.about ?? null) as string | null,
        }
      : undefined,
  };
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isFirebaseBacked = firebaseIsReady;

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;

    async function initLocal() {
      const s = readLocalSession();
      setUser(null);
      setProfile({
        uid: s.uid,
        role: s.role,
        status: s.status,
        fullName: s.fullName,
        email: s.email,
        anonymousEnabled: s.anonymousEnabled,
        anonymousId: s.anonymousId,
      });
      setLoading(false);
    }

    async function initFirebase() {
      if (!auth || !db) return initLocal();
      const a = auth;

      unsubAuth = onAuthStateChanged(a, async (u) => {
        try {
          setUser(u);
          if (u) {
            // First, ensure profile exists
            const p = await ensureFirestoreProfile(u.uid);
            if (p) setProfile(p);
            
            // Then set up real-time listener for profile updates
            if (db) {
              const profileRef = doc(db, "users", u.uid);
              unsubProfile = onSnapshot(profileRef, (snap) => {
                if (snap.exists()) {
                  const d = snap.data() as any;
                  const updatedProfile: UserProfile = {
                    uid: u.uid,
                    role: (d?.role ?? null) as UserRole | null,
                    status: (d?.status ?? "active") as AccountStatus,
                    fullName: (d?.fullName ?? null) as string | null,
                    email: (d?.email ?? null) as string | null,
                    anonymousEnabled: !!d?.anonymousEnabled,
                    anonymousId: (d?.anonymousId ?? null) as string | null,
                    student: d?.student
                      ? {
                          schoolEmail: (d.student.schoolEmail ?? null) as string | null,
                          educationLevel: (d.student.educationLevel ?? null) as string | null,
                          school: (d.student.school ?? null) as string | null,
                        }
                      : undefined,
                    application: d?.application
                      ? {
                          specialization: (d.application.specialization ?? null) as string | null,
                          about: (d.application.about ?? null) as string | null,
                        }
                      : undefined,
                  };
                  setProfile(updatedProfile);
                }
              }, (error) => {
                console.error("Profile listener error:", error);
              });
            }
          } else {
            if (unsubProfile) {
              unsubProfile();
              unsubProfile = null;
            }
            setProfile(null);
          }
          setLoading(false);
        } catch (e) {
          console.error("Auth init error:", e);
          await initLocal();
        }
      });
    }

    if (isFirebaseBacked) {
      void initFirebase();
    } else {
      void initLocal();
    }

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [isFirebaseBacked]);

  const loginWithEmail = async (email: string, password: string) => {
    if (!isFirebaseBacked || !auth) throw new Error("Firebase is not configured");
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signupStudent = async (input: {
    fullName: string;
    email: string;
    schoolEmail: string;
    educationLevel: string;
    school: string;
    password: string;
  }) => {
    if (!isFirebaseBacked || !auth || !db) throw new Error("Firebase is not configured");

    const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    await fbUpdateProfile(cred.user, { displayName: input.fullName.trim() });

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: "student",
        status: "active",
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        anonymousEnabled: false,
        anonymousId: null,
        student: {
          schoolEmail: input.schoolEmail.trim(),
          educationLevel: input.educationLevel.trim(),
          school: input.school.trim(),
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const applyForRole = async (input: {
    role: "peer-mentor" | "counselor";
    fullName: string;
    email: string;
    specialization: string;
    about: string;
    password: string;
  }) => {
    if (!isFirebaseBacked || !auth || !db) throw new Error("Firebase is not configured");

    const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    await fbUpdateProfile(cred.user, { displayName: input.fullName.trim() });

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: input.role,
        status: "pending",
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        anonymousEnabled: false,
        anonymousId: null,
        application: {
          specialization: input.specialization.trim(),
          about: input.about.trim(),
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const setStudentAnonymousEnabled = async (enabled: boolean) => {
    if (!profile) return;
    if (profile.role !== "student") throw new Error("Only students can enable anonymous mode");

    const nextAnonymousId = enabled ? profile.anonymousId || generateAnonymousId() : null;

    if (isFirebaseBacked && db && user) {
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          anonymousEnabled: enabled,
          anonymousId: nextAnonymousId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile((p) => (p ? { ...p, anonymousEnabled: enabled, anonymousId: nextAnonymousId } : p));
      return;
    }

    const s = readLocalSession();
    const next = { ...s, anonymousEnabled: enabled, anonymousId: nextAnonymousId };
    writeLocalSession(next);
    setProfile((p) => (p ? { ...p, anonymousEnabled: enabled, anonymousId: nextAnonymousId } : p));
  };

  const logout = async () => {
    try {
      if (isFirebaseBacked && auth) {
        await fbSignOut(auth);
      }
    } finally {
      if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
      setUser(null);
      setProfile(null);
      router.replace("/");
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      profile,
      loginWithEmail,
      signupStudent,
      applyForRole,
      setStudentAnonymousEnabled,
      logout,
      isFirebaseBacked,
    }),
    [loading, user, profile, isFirebaseBacked]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

