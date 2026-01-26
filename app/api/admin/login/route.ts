import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 });
    }

    const db = adminDb();
    const adminSnap = await db.collection("admins").where("username", "==", username.trim().toLowerCase()).limit(1).get();

    if (adminSnap.empty) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    const admin = adminSnap.docs[0].data();
    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Return admin data (without password)
    return NextResponse.json({
      ok: true,
      admin: {
        id: adminSnap.docs[0].id,
        username: admin.username,
        email: admin.email,
        createdAt: admin.createdAt,
      },
    });
  } catch (e: any) {
    console.error("Admin login error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
