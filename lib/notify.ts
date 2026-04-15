import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type NotificationType = "session_reminder" | "new_message" | "forum_reply" | "booking_confirmed" | "booking_cancelled" | "booking_request" | "application_received" | "application_approved" | "application_rejected" | "general";

interface NotifyOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  type: NotificationType;
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Preference key that must be enabled for each notification type.
 * If the user has toggled off the relevant preference, we skip the email.
 */
const TYPE_TO_PREF: Record<NotificationType, string> = {
  session_reminder: "sessionReminders",
  new_message: "newMessages",
  forum_reply: "forumReplies",
  booking_confirmed: "sessionReminders",
  booking_cancelled: "sessionReminders",
  booking_request: "sessionReminders",
  application_received: "emailNotifications",
  application_approved: "emailNotifications",
  application_rejected: "emailNotifications",
  general: "emailNotifications",
};

/**
 * Sends an email notification if the user has:
 *  1) emailNotifications enabled (master switch)
 *  2) the specific notification type enabled
 */
export async function sendNotification(opts: NotifyOptions): Promise<boolean> {
  try {
    if (!db) { console.warn("[Notify] No db"); return false; }

    const userSnap = await getDoc(doc(db, "users", opts.userId));
    const prefs = userSnap.data()?.preferences;

    if (prefs?.emailNotifications === false) {
      console.warn("[Notify] Email notifications disabled for user", opts.userId);
      return false;
    }

    const prefKey = TYPE_TO_PREF[opts.type];
    if (prefKey && prefs[prefKey] === false) {
      console.warn("[Notify] Type-specific pref disabled:", prefKey);
      return false;
    }

    const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "";
    console.log("[Notify] Sending email to", opts.userEmail, "type:", opts.type, "via", `${baseUrl}/api/notifications/email`);

    const res = await fetch(`${baseUrl}/api/notifications/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: opts.userEmail,
        type: opts.type,
        subject: opts.subject,
        studentName: opts.userName,
        body: opts.body,
        ctaText: opts.ctaText,
        ctaUrl: opts.ctaUrl,
      }),
    });

    const data = await res.json();
    console.log("[Notify] API response:", data);
    return data.ok === true;
  } catch (e) {
    console.warn("[Notify] Failed:", e);
    return false;
  }
}

// ── Convenience helpers ─────────────────────────────────────────

export function notifySessionReminder(userId: string, email: string, name: string, counselorName: string, dateTime: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "session_reminder",
    subject: `Reminder: Session with ${counselorName} today`,
    body: `Your session with ${counselorName} is scheduled for ${dateTime}.\n\nPlease be ready a few minutes before the session starts.`,
    ctaText: "Open Bookings",
    ctaUrl: `${appUrl}/student/bookings`,
  });
}

export function notifyNewMessage(userId: string, email: string, name: string, senderName: string, preview: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "new_message",
    subject: `New message from ${senderName}`,
    body: `${senderName} sent you a message:\n\n"${preview}"`,
    ctaText: "Open Inbox",
    ctaUrl: `${appUrl}/student/inbox`,
  });
}

export function notifyForumReply(userId: string, email: string, name: string, replierName: string, forumName: string, preview: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "forum_reply",
    subject: `${replierName} replied in #${forumName}`,
    body: `${replierName} replied to your post in #${forumName}:\n\n"${preview}"`,
    ctaText: "View Reply",
    ctaUrl: `${appUrl}/student/forums`,
  });
}

export function notifyBookingConfirmed(userId: string, email: string, name: string, counselorName: string, dateTime: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "booking_confirmed",
    subject: `Session confirmed with ${counselorName}`,
    body: `Your session with ${counselorName} has been confirmed for ${dateTime}.\n\nYou can join the session from your Bookings page when it's time.`,
    ctaText: "View Booking",
    ctaUrl: `${appUrl}/student/bookings`,
  });
}

export function notifyBookingCancelled(userId: string, email: string, name: string, counselorName: string, dateTime: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "booking_cancelled",
    subject: `Session cancelled: ${counselorName}`,
    body: `Your session with ${counselorName} scheduled for ${dateTime} has been cancelled.\n\nYou can rebook anytime from the Counselors page.`,
    ctaText: "Browse Counselors",
    ctaUrl: `${appUrl}/student/counselors`,
  });
}

// ── Counselor notifications ─────────────────────────────────────

export function notifyCounselorNewBooking(counselorId: string, counselorEmail: string, counselorName: string, studentName: string, dateTime: string, message: string | undefined, appUrl: string) {
  return sendNotification({
    userId: counselorId, userEmail: counselorEmail, userName: counselorName,
    type: "booking_request",
    subject: `New booking request from ${studentName}`,
    body: `${studentName} has requested a session with you for ${dateTime}.${message ? `\n\nTheir message: "${message}"` : ""}\n\nPlease review and accept or decline from your Bookings page.`,
    ctaText: "Review Request",
    ctaUrl: `${appUrl}/counselor/bookings`,
  });
}

export function notifyBookingDeclined(userId: string, email: string, name: string, counselorName: string, dateTime: string, appUrl: string) {
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "booking_cancelled",
    subject: `Session request declined: ${counselorName}`,
    body: `Your session request with ${counselorName} for ${dateTime} was not accepted.\n\nThis could be due to scheduling conflicts. You can try booking a different time slot or choose another counselor.`,
    ctaText: "Browse Counselors",
    ctaUrl: `${appUrl}/student/counselors`,
  });
}

export function notifyCounselorCancellation(counselorId: string, counselorEmail: string, counselorName: string, studentName: string, dateTime: string, appUrl: string) {
  return sendNotification({
    userId: counselorId, userEmail: counselorEmail, userName: counselorName,
    type: "booking_cancelled",
    subject: `${studentName} cancelled their session`,
    body: `${studentName} has cancelled their session scheduled for ${dateTime}.\n\nThe time slot is now available for other students.`,
    ctaText: "View Bookings",
    ctaUrl: `${appUrl}/counselor/bookings`,
  });
}

// ── Application notifications ────────────────────────────────────

export function notifyApplicationReceived(userId: string, email: string, name: string, role: string, appUrl: string) {
  const roleLabel = role === "counselor" ? "Counselor" : "Peer Mentor";
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "application_received",
    subject: `Your ${roleLabel} application has been received`,
    body: `Hi ${name},\n\nThank you for applying to be a ${roleLabel} on Theraklick! We've received your application and our team is reviewing it.\n\nYou'll receive an email once a decision has been made. This usually takes 1-3 business days.\n\nThank you for wanting to make a difference!`,
    ctaText: "Check Status",
    ctaUrl: `${appUrl}/pending-approval`,
  });
}

export function notifyApplicationApproved(userId: string, email: string, name: string, role: string, appUrl: string) {
  const roleLabel = role === "counselor" ? "Counselor" : "Peer Mentor";
  const dashboardUrl = role === "counselor" ? `${appUrl}/counselor/dashboard` : `${appUrl}/peer-mentor/dashboard`;
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "application_approved",
    subject: `Congratulations! You've been approved as a ${roleLabel}`,
    body: `Hi ${name},\n\nGreat news! Your application to be a ${roleLabel} on Theraklick has been approved.\n\nYou can now log in and start helping students. Set up your profile, add your availability, and begin making a difference.\n\nWelcome to the team!`,
    ctaText: "Go to Dashboard",
    ctaUrl: dashboardUrl,
  });
}

export function notifyApplicationRejected(userId: string, email: string, name: string, role: string, appUrl: string) {
  const roleLabel = role === "counselor" ? "Counselor" : "Peer Mentor";
  return sendNotification({
    userId, userEmail: email, userName: name,
    type: "application_rejected",
    subject: `Update on your ${roleLabel} application`,
    body: `Hi ${name},\n\nThank you for your interest in becoming a ${roleLabel} on Theraklick.\n\nAfter careful review, we're unable to approve your application at this time. This could be due to incomplete information or our current team capacity.\n\nYou're welcome to reapply in the future. If you have questions, please reach out to our support team.\n\nThank you for wanting to help!`,
    ctaText: "Visit Theraklick",
    ctaUrl: appUrl,
  });
}
