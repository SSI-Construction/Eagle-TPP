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

export interface ChangeRequestNotice {
  to: string;
  recipientName: string;
  requestedByName: string;
  projectName: string;
  requestType: "reschedule" | "cancel";
  currentStart: string;
  currentEnd: string;
  proposedStart: string | null;
  proposedEnd: string | null;
  reason: string | null;
}

/** Notifies the other side of a booking that a reschedule/cancellation was requested. */
export async function sendChangeRequestEmail(notice: ChangeRequestNotice): Promise<void> {
  const action = notice.requestType === "cancel" ? "cancel" : "reschedule";
  const subject = `Booking ${action} request: ${notice.projectName}`;
  const lines = [
    `Hi ${notice.recipientName},`,
    "",
    `${notice.requestedByName} requested to ${action} the booking for "${notice.projectName}".`,
    "",
    `Current dates: ${notice.currentStart} \u2192 ${notice.currentEnd}`,
  ];
  if (notice.requestType === "reschedule" && notice.proposedStart && notice.proposedEnd) {
    lines.push(`Proposed dates: ${notice.proposedStart} \u2192 ${notice.proposedEnd}`);
  }
  if (notice.reason) {
    lines.push("", `Reason: ${notice.reason}`);
  }
  lines.push("", "Sign in to review and respond to this request.", "", "— Trade Schedule");

  await sendEmail(notice.to, subject, lines.join("\n"));
}

export interface ChangeRequestDecisionNotice {
  to: string;
  recipientName: string;
  projectName: string;
  requestType: "reschedule" | "cancel";
  decision: "approved" | "rejected";
  respondedByName: string;
  note: string | null;
}

/** Notifies the original requester whether their reschedule/cancellation request was accepted. */
export async function sendChangeRequestDecisionEmail(
  notice: ChangeRequestDecisionNotice,
): Promise<void> {
  const action = notice.requestType === "cancel" ? "cancellation" : "reschedule";
  const subject = `Your ${action} request was ${notice.decision}: ${notice.projectName}`;
  const lines = [
    `Hi ${notice.recipientName},`,
    "",
    `${notice.respondedByName} ${notice.decision} your ${action} request for "${notice.projectName}".`,
  ];
  if (notice.note) {
    lines.push("", `Note: ${notice.note}`);
  }
  lines.push("", "— Trade Schedule");

  await sendEmail(notice.to, subject, lines.join("\n"));
}
