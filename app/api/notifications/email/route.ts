import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * Email notification API route.
 *
 * Sends transactional emails for: session reminders, new messages,
 * forum replies, and general notifications.
 *
 * Requires these env vars in .env.local:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password        (Gmail: use App Password, not your login password)
 *   SMTP_FROM=Theraklick <noreply@theraklick.com>
 */

type NotificationType = "session_reminder" | "new_message" | "forum_reply" | "booking_confirmed" | "booking_cancelled" | "booking_request" | "application_received" | "application_approved" | "application_rejected" | "general";

interface EmailPayload {
  to: string;
  type: NotificationType;
  subject: string;
  studentName?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

function buildHtml(payload: EmailPayload): string {
  const { studentName, body, ctaText, ctaUrl, type } = payload;

  const typeColors: Record<NotificationType, string> = {
    session_reminder: "#2BB5A0",
    new_message: "#0F4F47",
    forum_reply: "#7C3AED",
    booking_confirmed: "#2BB5A0",
    booking_cancelled: "#EF4444",
    booking_request: "#F59E0B",
    application_received: "#0F4F47",
    application_approved: "#2BB5A0",
    application_rejected: "#EF4444",
    general: "#0F4F47",
  };

  const accentColor = typeColors[type] || "#0F4F47";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:${accentColor};padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Theraklick</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${studentName ? `<p style="margin:0 0 16px;color:#333;font-size:15px;">Hi ${studentName},</p>` : ""}
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">${body.replace(/\n/g, "<br>")}</p>
          ${ctaText && ctaUrl ? `
          <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">
            ${ctaText}
          </a>` : ""}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:12px;">
            You received this because you have email notifications enabled on Theraklick.
            <br>To unsubscribe, go to Settings → Notifications in the app.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as EmailPayload;

    if (!payload.to || !payload.subject || !payload.body) {
      return NextResponse.json({ ok: false, error: "Missing required fields: to, subject, body" }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `Theraklick <${user}>`;

    if (!host || !user || !pass) {
      console.warn("SMTP not configured — email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local");
      return NextResponse.json({ ok: false, error: "Email service not configured" }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: buildHtml(payload),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("Email send error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
