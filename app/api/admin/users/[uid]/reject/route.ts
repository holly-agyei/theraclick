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

    await db.collection("users").doc(uid).set({ status: "disabled", updatedAt: new Date() }, { merge: true });

    // Send rejection email via SMTP
    if (userData?.email) {
      try {
        const role = userData.role === "counselor" ? "Counselor" : "Peer Mentor";
        const name = userData.fullName || "there";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || "Theraklick <noreply@theraklick.com>",
          to: userData.email,
          subject: `Update on your ${role} application`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
              <h2 style="color:#0F4F47;">Theraklick Application Update</h2>
              <p>Hi ${name},</p>
              <p>Thank you for your interest in becoming a <strong>${role}</strong> on Theraklick.</p>
              <p>After careful review, we're unable to approve your application at this time. This could be due to incomplete information or our current team capacity.</p>
              <p>You're welcome to reapply in the future. If you have questions, please reach out to our support team.</p>
              <div style="margin:24px 0;text-align:center;">
                <a href="${appUrl}" style="background:#0F4F47;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Visit Theraklick</a>
              </div>
              <p style="color:#888;font-size:13px;">Thank you for wanting to help!</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
