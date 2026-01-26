import { firebaseIsReady, db } from "@/lib/firebase";
import type { UserProfile } from "@/context/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export type StoredChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: number;
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
      { id: threadId, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
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

