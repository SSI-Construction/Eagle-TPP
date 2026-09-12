import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = process.env.EMAIL_FROM || "Trade Schedule <onboarding@resend.dev>";

/**
 * Sends a plain-text email, or logs it to the console when no RESEND_API_KEY
 * is configured (local dev / demo mode) so nothing crashes and you can still
 * see what would have been sent.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!resend) {
    console.log(`[email] (RESEND_API_KEY not set, logging only)\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, text });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export interface BookingRescheduledNotice {
  to: string;
  recipientName: string;
  projectName: string;
  tradeName: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  reason: string;
}

/** Notifies whoever created a booking that its dates have changed. */
export async function sendBookingRescheduledEmail(notice: BookingRescheduledNotice): Promise<void> {
  const subject = `Booking dates changed: ${notice.projectName}`;
  const text = [
    `Hi ${notice.recipientName},`,
    "",
    `Your booking for ${notice.tradeName} on "${notice.projectName}" ${notice.reason}.`,
    "",
    `Previous dates: ${notice.oldStart} \u2192 ${notice.oldEnd}`,
    `New dates: ${notice.newStart} \u2192 ${notice.newEnd}`,
    "",
    "— Trade Schedule",
  ].join("\n");

  await sendEmail(notice.to, subject, text);
}

export interface BookingCreatedNotice {
  to: string;
  tradeName: string;
  projectName: string;
  projectNumber: string | null;
  projectLocation: string | null;
  bookedByName: string;
  startDate: string;
  endDate: string;
  crewCount: number;
}

/** Notifies a trade that internal staff requested capacity for a project. */
export async function sendBookingCreatedEmail(notice: BookingCreatedNotice): Promise<void> {
  const subject = `Booking request: ${notice.projectName}`;
  const text = [
    `Hi ${notice.tradeName},`,
    "",
    `${notice.bookedByName} requested ${notice.crewCount} of your crew${notice.crewCount === 1 ? "" : "s"} for "${notice.projectName}".`,
    "",
    `Project number: ${notice.projectNumber || "Not provided"}`,
    `Location: ${notice.projectLocation || "Not provided"}`,
    `Dates: ${notice.startDate} \u2192 ${notice.endDate}`,
    "",
    "Sign in to review and confirm this request.",
    "",
    "— Trade Schedule",
  ].join("\n");

  await sendEmail(notice.to, subject, text);
}
