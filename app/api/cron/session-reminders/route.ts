import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

/**
 * Cron endpoint: hit by cron-job.org every 30 minutes.
 * Finds sessions starting within the next hour and sends reminder emails
 * to students who have email + session reminder notifications enabled.
 *
 * Secured with CRON_SECRET — cron-job.org sends it as a header.
 */

// Firebase Admin init (server-side, not the client SDK)
function getDb() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    // Use Application Default Credentials or service account
    // For Vercel/production, set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({ credential: cert(serviceAccount), projectId });
    } else {
      initializeApp({ projectId });
    }
  }
  return getFirestore();
}

function buildReminderHtml(studentName: string, counselorName: string, dateTime: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#2BB5A0;padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">⏰ Session Reminder</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#333;font-size:15px;">Hi ${studentName},</p>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            Your session with <strong>${counselorName}</strong> is coming up at <strong>${dateTime}</strong>.<br><br>
            Please be ready a few minutes before the session starts. You can join directly from your Bookings page.
          </p>
          <a href="${appUrl}/student/bookings" style="display:inline-block;background:#2BB5A0;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">
            Open Bookings
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:12px;">
            You received this because you have session reminders enabled on Theraklick.
            <br>To unsubscribe, go to Settings → Notifications in the app.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://theraklick.vercel.app";

    // Find sessions in the next 60 minutes that haven't been reminded yet
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    const todayStr = now.toISOString().split("T")[0];

    // Query bookings for today that are confirmed/pending
    const bookingsSnap = await db
      .collection("bookings")
      .where("date", "==", todayStr)
      .where("status", "in", ["confirmed", "pending"])
      .get();

    if (bookingsSnap.empty) {
      return NextResponse.json({ ok: true, sent: 0, message: "No sessions today" });
    }

    // SMTP setup
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const bookingDoc of bookingsSnap.docs) {
      const booking = bookingDoc.data();

      // Parse the session start time
      const sessionStart = new Date(`${booking.date}T${booking.startTime}`);
      if (isNaN(sessionStart.getTime())) continue;

      // Only remind if session is within the next 60 minutes and hasn't started yet
      if (sessionStart <= now || sessionStart > inOneHour) continue;

      // Skip if already reminded
      if (booking.reminderSent) continue;

      // Get student preferences
      const studentSnap = await db.collection("users").doc(booking.studentId).get();
      const student = studentSnap.data();
      if (!student?.email) continue;

      const prefs = student.preferences || {};
      if (prefs.emailNotifications === false || prefs.sessionReminders === false) continue;

      // Format time for display
      const [h, m] = booking.startTime.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const timeStr = `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `Theraklick <${process.env.SMTP_USER}>`,
          to: student.email,
          subject: `⏰ Session with ${booking.counselorName} in less than 1 hour`,
          html: buildReminderHtml(
            student.fullName || "there",
            booking.counselorName || "your counselor",
            timeStr, appUrl
          ),
        });

        // Mark as reminded so we don't send duplicates
        await db.collection("bookings").doc(bookingDoc.id).update({ reminderSent: true });
        sent++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown";
        errors.push(`Failed for ${booking.studentId}: ${msg}`);
      }
    }

    return NextResponse.json({ ok: true, sent, errors: errors.length ? errors : undefined });
  } catch (e: unknown) {
    console.error("Cron error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
