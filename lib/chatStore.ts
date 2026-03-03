import { firebaseIsReady, db } from "@/lib/firebase";
import type { UserProfile } from "@/context/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type StoredChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: number;
};

export type AiThread = {
  id: string;
  title: string;
  updatedAt: number;
};

const LS_PREFIX = "theraclick.aiThread.v1";

function lsKey(uid: string, threadId: string) {
  return `${LS_PREFIX}.${uid}.${threadId}`;
}

export async function ensureDefaultAiThread(profile: UserProfile) {
  const threadId = "default";
  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(
      threadRef,
      { id: threadId, title: "New chat", updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
  } else if (typeof window !== "undefined") {
    const key = lsKey(profile.uid, threadId);
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
  }
  return threadId;
}

export async function loadAiThreadMessages(profile: UserProfile, threadId: string) {
  if (firebaseIsReady && db) {
    const msgCol = collection(db, "users", profile.uid, "aiThreads", threadId, "messages");
    const q = query(msgCol, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      const ts = data?.createdAt?.toMillis?.() ?? Date.now();
      return {
        id: d.id,
        sender: (data.sender ?? "ai") as "user" | "ai",
        text: (data.text ?? "") as string,
        createdAt: ts,
      } satisfies StoredChatMessage;
    });
  }

  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(lsKey(profile.uid, threadId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredChatMessage[];
  } catch {
    return [];
  }
}

export async function appendAiThreadMessage(
  profile: UserProfile,
  threadId: string,
  message: Omit<StoredChatMessage, "id" | "createdAt">
) {
  if (firebaseIsReady && db) {
    const msgCol = collection(db, "users", profile.uid, "aiThreads", threadId, "messages");
    const res = await addDoc(msgCol, {
      sender: message.sender,
      text: message.text,
      createdAt: serverTimestamp(),
    });
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(threadRef, { updatedAt: serverTimestamp() }, { merge: true });
    return res.id;
  }

  if (typeof window === "undefined") return "ssr";
  const key = lsKey(profile.uid, threadId);
  const existing = await loadAiThreadMessages(profile, threadId);
  const next: StoredChatMessage[] = [
    ...existing,
    { id: `${Date.now()}`, sender: message.sender, text: message.text, createdAt: Date.now() },
  ];
  localStorage.setItem(key, JSON.stringify(next));
  return next[next.length - 1]!.id;
}

// ── Multi-thread support ─────────────────────────────────────────

const LS_THREADS_KEY = (uid: string) => `${LS_PREFIX}.${uid}._threads`;

export async function listAiThreads(profile: UserProfile): Promise<AiThread[]> {
  if (firebaseIsReady && db) {
    const threadsCol = collection(db, "users", profile.uid, "aiThreads");
    const q = query(threadsCol, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        title: data.title || "New chat",
        updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
      };
    });
  }

  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_THREADS_KEY(profile.uid));
    if (!raw) return [];
    return (JSON.parse(raw) as AiThread[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function createAiThread(profile: UserProfile): Promise<string> {
  const threadId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(threadRef, {
      id: threadId,
      title: "New chat",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LS_THREADS_KEY(profile.uid));
    const threads: AiThread[] = raw ? JSON.parse(raw) : [];
    threads.unshift({ id: threadId, title: "New chat", updatedAt: Date.now() });
    localStorage.setItem(LS_THREADS_KEY(profile.uid), JSON.stringify(threads));
    localStorage.setItem(lsKey(profile.uid, threadId), JSON.stringify([]));
  }

  return threadId;
}

export async function deleteAiThread(profile: UserProfile, threadId: string): Promise<void> {
  if (firebaseIsReady && db) {
    // Delete all messages in the subcollection first
    const msgCol = collection(db, "users", profile.uid, "aiThreads", threadId, "messages");
    const snap = await getDocs(msgCol);
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
    // Then delete the thread doc
    await deleteDoc(doc(db, "users", profile.uid, "aiThreads", threadId));
  } else if (typeof window !== "undefined") {
    localStorage.removeItem(lsKey(profile.uid, threadId));
    const raw = localStorage.getItem(LS_THREADS_KEY(profile.uid));
    if (raw) {
      const threads = (JSON.parse(raw) as AiThread[]).filter((t) => t.id !== threadId);
      localStorage.setItem(LS_THREADS_KEY(profile.uid), JSON.stringify(threads));
    }
  }
}

export async function updateThreadTitle(profile: UserProfile, threadId: string, title: string): Promise<void> {
  const trimmed = title.length > 40 ? title.slice(0, 40) + "…" : title;

  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await updateDoc(threadRef, { title: trimmed });
  } else if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LS_THREADS_KEY(profile.uid));
    if (raw) {
      const threads = JSON.parse(raw) as AiThread[];
      const t = threads.find((t) => t.id === threadId);
      if (t) t.title = trimmed;
      localStorage.setItem(LS_THREADS_KEY(profile.uid), JSON.stringify(threads));
    }
  }
}

