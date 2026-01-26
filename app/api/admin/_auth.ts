import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Check if admin session is valid
export async function requireAdminSession(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminId = authHeader.replace("Bearer ", "");
    const db = adminDb();
    const adminDoc = await db.collection("admins").doc(adminId).get();

    if (!adminDoc.exists) {
      return NextResponse.json({ ok: false, error: "Invalid admin session" }, { status: 401 });
    }

    return null; // Authorized
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Auth error" }, { status: 401 });
  }
}

// Legacy API key support (for backward compatibility)
export function requireAdmin(req: Request) {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
