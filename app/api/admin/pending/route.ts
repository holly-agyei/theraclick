import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession, requireAdmin } from "../_auth";

export async function GET(req: Request) {
  // Try session auth first, fallback to API key
  const unauthorized = await requireAdminSession(req);
  if (unauthorized) {
    const apiKeyUnauthorized = requireAdmin(req);
    if (apiKeyUnauthorized) return apiKeyUnauthorized;
  }

  try {
    const db = adminDb();
    const snap = await db.collection("users").where("status", "==", "pending").get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

