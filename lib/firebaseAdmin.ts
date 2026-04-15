import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/** Vercel / hosts often store the key as one line with `\n`; some pastes include wrapping quotes or real newlines. */
function normalizePrivateKeyEnv(raw: string): string {
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  k = k.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (k.includes("\\n")) {
    k = k.replace(/\\n/g, "\n");
  }
  return k;
}

export function adminDb() {
  if (getApps().length === 0) {
    let credential;

    // Try service account key file first (if provided)
    const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH || path.join(process.cwd(), "serviceAccountKey.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      // Use service account key file
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      credential = cert(serviceAccount);
    } else {
      // Fallback to environment variables
      const projectId = requireEnv("FIREBASE_ADMIN_PROJECT_ID");
      const clientEmail = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
      const privateKey = normalizePrivateKeyEnv(requireEnv("FIREBASE_ADMIN_PRIVATE_KEY"));

      credential = cert({ projectId, clientEmail, privateKey });
    }

    initializeApp({
      credential,
    });
  }
  return getFirestore();
}
