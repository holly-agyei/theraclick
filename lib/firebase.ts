// Firebase configuration
// Replace with your actual Firebase config
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo",
};

export const firebaseIsDemo =
  firebaseConfig.apiKey === "demo" ||
  firebaseConfig.authDomain === "demo" ||
  firebaseConfig.projectId === "demo" ||
  firebaseConfig.storageBucket === "demo" ||
  firebaseConfig.messagingSenderId === "demo" ||
  firebaseConfig.appId === "demo";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (typeof window !== "undefined") {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db, storage };

export const firebaseIsReady = !!auth && !!db && !firebaseIsDemo;

