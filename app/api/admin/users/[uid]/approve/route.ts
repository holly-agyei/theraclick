import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession, requireAdmin } from "../../../_auth";
import nodemailer from "nodemailer";

export async function POST(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const unauthorized = await requireAdminSession(req);
  if (unauthorized) {
    const apiKeyUnauthorized = requireAdmin(req);
    if (apiKeyUnauthorized) return apiKeyUnauthorized;
  }

  try {
    const { uid } = await ctx.params;
    const db = adminDb();

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    await db.collection("users").doc(uid).set({ status: "active", updatedAt: new Date() }, { merge: true });

    // Send approval email via SMTP
    if (userData?.email) {
      try {
        const role = userData.role === "counselor" ? "Counselor" : "Peer Mentor";
        const name = userData.fullName || "there";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const dashboardUrl = userData.role === "counselor" ? `${appUrl}/counselor/dashboard` : `${appUrl}/peer-mentor/dashboard`;

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || "Theraklick <noreply@theraklick.com>",
          to: userData.email,
          subject: `Congratulations! You've been approved as a ${role}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
              <h2 style="color:#0F4F47;">Welcome to Theraklick!</h2>
              <p>Hi ${name},</p>
              <p>Great news! Your application to be a <strong>${role}</strong> on Theraklick has been <strong style="color:#2BB5A0;">approved</strong>.</p>
              <p>You can now log in and start helping students. Set up your profile, add your availability, and begin making a difference.</p>
              <div style="margin:24px 0;text-align:center;">
                <a href="${dashboardUrl}" style="background:#0F4F47;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Go to Dashboard</a>
              </div>
              <p style="color:#888;font-size:13px;">Welcome to the team!</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
