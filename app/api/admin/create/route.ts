import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

// This endpoint creates the first admin account
// Should be protected or run once manually
export async function POST(req: Request) {
  try {
    const { username, password, email } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 });
    }

    const db = adminDb();
    
    // Check if admin already exists
    const existing = await db.collection("admins").where("username", "==", username.trim().toLowerCase()).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ ok: false, error: "Admin already exists" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    await db.collection("admins").add({
      username: username.trim().toLowerCase(),
      passwordHash,
      email: email?.trim() || "",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, message: "Admin created successfully" });
  } catch (e: any) {
    console.error("Create admin error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
