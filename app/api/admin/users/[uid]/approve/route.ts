import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession, requireAdmin } from "../../../_auth";

export async function POST(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  // Try session auth first, fallback to API key
  const unauthorized = await requireAdminSession(req);
  if (unauthorized) {
    const apiKeyUnauthorized = requireAdmin(req);
    if (apiKeyUnauthorized) return apiKeyUnauthorized;
  }

  try {
    const { uid } = await ctx.params;
    const db = adminDb();
    await db.collection("users").doc(uid).set({ status: "active", updatedAt: new Date() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

