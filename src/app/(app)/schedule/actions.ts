"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { dateRange, diffDays, shiftDateKey, totalCrewsForDate } from "@/lib/capacity";
import { isDemoMode } from "@/lib/demo/config";
import {
  demoCancelBooking,
  demoConfirmBooking,
  demoCreateBooking,
  demoAddTradeCrewMember,
  demoSetBookingCrewMembers,
  demoToggleTradeCrewMember,
  demoUpdateBooking,
  demoUpdateBookingEndDate,
} from "@/lib/demo/store";
import { sendBookingCreatedEmail, sendBookingRescheduledEmail } from "@/lib/email";

const bookingSchema = z
  .object({
    projectId: z.string().min(1),
    tradeId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    crewCount: z.coerce.number().int().min(1).max(50),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type CreateBookingResult =
  | { ok: true }
  | { ok: false; error: string; conflictDates?: string[] };

export async function createBooking(
  input: z.infer<typeof bookingSchema>,
): Promise<CreateBookingResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking" };
  }
  const { projectId, tradeId, startDate, endDate, crewCount, notes } = parsed.data;

  const profile = await getCurrentProfile();
  if (!profile || !["admin", "pm", "site_supervisor"].includes(profile.role)) {
    return { ok: false, error: "You do not have permission to book trades." };
  }

  if (isDemoMode()) {
    const result = await demoCreateBooking({
      projectId,
      tradeId,
      startDate,
      endDate,
      crewCount,
      notes,
      createdBy: profile.id,
      bookedByName: profile.full_name || "A project manager",
    });
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();

  const [
    { data: crews },
    { data: existingBookings },
    { data: externalCommitments },
    { data: capacityOverrides },
  ] =
    await Promise.all([
      supabase.from("crews").select("id").eq("trade_id", tradeId).eq("is_active", true),
      supabase
        .from("bookings")
        .select("start_date, end_date, crew_count, status")
        .eq("trade_id", tradeId)
        .neq("status", "cancelled")
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("trade_external_commitments")
        .select("start_date, end_date, crew_count")
        .eq("trade_id", tradeId)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("trade_capacity_overrides")
        .select("start_date, end_date, total_crews")
        .eq("trade_id", tradeId)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);

  const totalCrews = crews?.length ?? 0;
  const datedTotals = (capacityOverrides ?? []).map((override) => ({
    startDate: override.start_date,
    endDate: override.end_date,
    totalCrews: override.total_crews,
  }));
  const start = new Date(`${startDate}T00:00:00`);
  const days = dateRange(start, dayCount(startDate, endDate));

  const conflictDates: string[] = [];
  for (const day of days) {
    const booked =
      (existingBookings ?? [])
        .filter((b) => day >= b.start_date && day <= b.end_date)
        .reduce((sum, b) => sum + b.crew_count, 0) +
      (externalCommitments ?? [])
        .filter((e) => day >= e.start_date && day <= e.end_date)
        .reduce((sum, e) => sum + e.crew_count, 0);

    if (booked + crewCount > totalCrewsForDate(totalCrews, day, datedTotals)) {
      conflictDates.push(day);
    }
  }

  if (conflictDates.length > 0) {
    return {
      ok: false,
      error: `Not enough crew capacity on ${conflictDates.length} day(s). This trade doesn't have ${crewCount} free crew(s) for the full date range.`,
      conflictDates,
    };
  }

  const { error } = await supabase.from("bookings").insert({
    project_id: projectId,
    trade_id: tradeId,
    start_date: startDate,
    end_date: endDate,
    crew_count: crewCount,
    notes: notes || null,
    created_by: profile.id,
    status: "tentative",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const [{ data: trade }, { data: project }] = await Promise.all([
    supabase.from("trades").select("email, company_name").eq("id", tradeId).maybeSingle(),
    supabase
      .from("projects")
      .select("name, project_number, address, map_link")
      .eq("id", projectId)
      .maybeSingle(),
  ]);
  if (trade?.email) {
    await sendBookingCreatedEmail({
      to: trade.email,
      tradeName: trade.company_name,
      projectName: project?.name ?? "Unknown project",
      projectNumber: project?.project_number ?? null,
      projectLocation: project?.map_link || project?.address || null,
      bookedByName: profile.full_name || "A project manager",
      startDate,
      endDate,
      crewCount,
    });
  }

  revalidatePath("/schedule");
  return { ok: true };
}

export async function confirmBooking(bookingId: string): Promise<CreateBookingResult> {
  if (!bookingId) return { ok: false, error: "Invalid booking request." };

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "trade" || !profile.trade_id) {
    return { ok: false, error: "Only the requested trade can confirm this booking." };
  }

  if (isDemoMode()) {
    const result = demoConfirmBooking(bookingId, profile.trade_id, profile.id);
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();
  const { data: booking, error: findError } = await supabase
    .from("bookings")
    .select("id, trade_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (findError || !booking || booking.status === "cancelled") {
    return { ok: false, error: "Booking request not found." };
  }
  if (booking.trade_id !== profile.trade_id) {
    return { ok: false, error: "You can only confirm requests for your own trade." };
  }
  if (booking.status !== "tentative") {
    return { ok: false, error: "This booking is already confirmed." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      confirmed_by: profile.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("trade_id", profile.trade_id)
    .eq("status", "tentative");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  return { ok: true };
}

const crewMemberSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
});

export async function addTradeCrewMember(
  input: z.infer<typeof crewMemberSchema>,
): Promise<CreateBookingResult> {
  const parsed = crewMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid crew member" };
  }

  const profile = await getCurrentProfile();
  if (profile?.role !== "trade" || !profile.trade_id) {
    return { ok: false, error: "Only trade partners can manage their crew roster." };
  }

  if (isDemoMode()) {
    const result = demoAddTradeCrewMember({ tradeId: profile.trade_id, ...parsed.data });
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trade_crew_members").insert({
    trade_id: profile.trade_id,
    name: parsed.data.name,
    role: parsed.data.role,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  return { ok: true };
}

export async function toggleTradeCrewMember(
  memberId: string,
  isActive: boolean,
): Promise<CreateBookingResult> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "trade" || !profile.trade_id) {
    return { ok: false, error: "Only trade partners can manage their crew roster." };
  }

  if (isDemoMode()) {
    const result = demoToggleTradeCrewMember(memberId, isActive, profile.trade_id);
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trade_crew_members")
    .update({ is_active: isActive })
    .eq("id", memberId)
    .eq("trade_id", profile.trade_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  return { ok: true };
}

const crewAssignmentSchema = z.object({
  bookingId: z.string().min(1),
  memberIds: z.array(z.string().min(1)).max(100).transform((ids) => [...new Set(ids)]),
});

export async function setBookingCrewMembers(input: {
  bookingId: string;
  memberIds: string[];
}): Promise<CreateBookingResult> {
  const parsed = crewAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid crew assignment" };
  }

  const profile = await getCurrentProfile();
  if (profile?.role !== "trade" || !profile.trade_id) {
    return { ok: false, error: "Only trade partners can assign crew members." };
  }

  if (isDemoMode()) {
    const result = demoSetBookingCrewMembers(
      parsed.data.bookingId,
      parsed.data.memberIds,
      profile.trade_id,
    );
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();
  const [{ data: booking, error: bookingError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id")
        .eq("id", parsed.data.bookingId)
        .eq("trade_id", profile.trade_id)
        .maybeSingle(),
      parsed.data.memberIds.length > 0
        ? supabase
            .from("trade_crew_members")
            .select("id")
            .eq("trade_id", profile.trade_id)
            .in("id", parsed.data.memberIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (bookingError || !booking) return { ok: false, error: "Booking not found." };
  if (membersError || members?.length !== parsed.data.memberIds.length) {
    return { ok: false, error: "One or more crew members could not be found." };
  }

  const { data: currentAssignments, error: assignmentsError } = await supabase
    .from("booking_crew_members")
    .select("crew_member_id")
    .eq("booking_id", parsed.data.bookingId);
  if (assignmentsError) return { ok: false, error: assignmentsError.message };

  const currentIds = new Set((currentAssignments ?? []).map((item) => item.crew_member_id));
  const requestedIds = new Set(parsed.data.memberIds);
  const removedIds = [...currentIds].filter((id) => !requestedIds.has(id));
  const addedIds = [...requestedIds].filter((id) => !currentIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await supabase
      .from("booking_crew_members")
      .delete()
      .eq("booking_id", parsed.data.bookingId)
      .in("crew_member_id", removedIds);
    if (error) return { ok: false, error: error.message };
  }

  if (addedIds.length > 0) {
    const { error } = await supabase.from("booking_crew_members").insert(
      addedIds.map((crewMemberId) => ({
        booking_id: parsed.data.bookingId,
        crew_member_id: crewMemberId,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/schedule");
  return { ok: true };
}

const updateBookingSchema = bookingSchema.extend({
  bookingId: z.string().min(1),
  status: z.enum(["tentative", "confirmed", "cancelled"]),
});

export async function updateBooking(
  input: z.infer<typeof updateBookingSchema>,
): Promise<CreateBookingResult> {
  const parsed = updateBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid booking" };
  }

  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can modify bookings." };
  }

  if (isDemoMode()) {
    const result = demoUpdateBooking({ ...parsed.data, updatedBy: profile.id });
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const { bookingId, projectId, tradeId, startDate, endDate, crewCount, status, notes } =
    parsed.data;
  const supabase = await createClient();

  if (status !== "cancelled") {
    const [
      { data: crews },
      { data: otherBookings },
      { data: externalCommitments },
      { data: capacityOverrides },
    ] =
      await Promise.all([
        supabase.from("crews").select("id").eq("trade_id", tradeId).eq("is_active", true),
        supabase
          .from("bookings")
          .select("start_date, end_date, crew_count, status")
          .eq("trade_id", tradeId)
          .neq("id", bookingId)
          .neq("status", "cancelled")
          .lte("start_date", endDate)
          .gte("end_date", startDate),
        supabase
          .from("trade_external_commitments")
          .select("start_date, end_date, crew_count")
          .eq("trade_id", tradeId)
          .lte("start_date", endDate)
          .gte("end_date", startDate),
        supabase
          .from("trade_capacity_overrides")
          .select("start_date, end_date, total_crews")
          .eq("trade_id", tradeId)
          .lte("start_date", endDate)
          .gte("end_date", startDate),
      ]);

    const totalCrews = crews?.length ?? 0;
    const datedTotals = (capacityOverrides ?? []).map((override) => ({
      startDate: override.start_date,
      endDate: override.end_date,
      totalCrews: override.total_crews,
    }));
    const days = dateRange(
      new Date(`${startDate}T00:00:00`),
      dayCount(startDate, endDate),
    );
    const hasConflict = days.some((day) => {
      const used =
        (otherBookings ?? [])
          .filter((item) => day >= item.start_date && day <= item.end_date)
          .reduce((sum, item) => sum + item.crew_count, 0) +
        (externalCommitments ?? [])
          .filter((item) => day >= item.start_date && day <= item.end_date)
          .reduce((sum, item) => sum + item.crew_count, 0);
      return used + crewCount > totalCrewsForDate(totalCrews, day, datedTotals);
    });
    if (hasConflict) {
      return { ok: false, error: "The updated booking exceeds available capacity." };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      project_id: projectId,
      trade_id: tradeId,
      start_date: startDate,
      end_date: endDate,
      crew_count: crewCount,
      status,
      notes: notes || null,
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/schedule");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<CreateBookingResult> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can cancel bookings." };
  }

  if (isDemoMode()) {
    const result = demoCancelBooking(bookingId);
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/schedule");
  return { ok: true };
}

export interface BookingShift {
  id: string;
  label: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

export type UpdateBookingEndDateResult =
  | { ok: true }
  | { ok: false; error: string; needsConfirmation?: boolean; shifts?: BookingShift[] };

/**
 * Lets a trade shorten or extend one of their own bookings.
 * Shortening always succeeds (it only frees up capacity). Extending re-checks
 * capacity for the newly-added days; if it now overlaps other bookings for
 * the same trade, the caller must pass `cascade: true` to push those later
 * bookings forward (same duration, starting right after this one ends).
 * External commitments can never be pushed and will hard-block the extension.
 */
export async function updateBookingEndDate(input: {
  bookingId: string;
  newEndDate: string;
  cascade?: boolean;
}): Promise<UpdateBookingEndDateResult> {
  const { bookingId, newEndDate, cascade = false } = input;
  if (!bookingId || !newEndDate) return { ok: false, error: "Invalid request." };

  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  if (isDemoMode()) {
    const result = await demoUpdateBookingEndDate({
      bookingId,
      newEndDate,
      cascade,
      requesterRole: profile.role,
      requesterTradeId: profile.trade_id,
    });
    if (result.ok) revalidatePath("/schedule");
    return result;
  }

  const supabase = await createClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, trade_id, project_id, start_date, end_date, crew_count, status, created_by")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "cancelled") {
    return { ok: false, error: "This booking has been cancelled." };
  }

  // Only the trade itself (for its own work) or an admin can move dates — PMs and
  // site supervisors can book available slots but can't reschedule already-booked work.
  const canEdit =
    profile.role === "admin" || (profile.role === "trade" && profile.trade_id === booking.trade_id);
  if (!canEdit) {
    return { ok: false, error: "Only the trade or an admin can change booking dates." };
  }

  if (newEndDate < booking.start_date) {
    return { ok: false, error: "End date can't be before the start date." };
  }

  const [{ data: trade }, { data: projects }] = await Promise.all([
    supabase.from("trades").select("company_name").eq("id", booking.trade_id).maybeSingle(),
    supabase.from("projects").select("id, name"),
  ]);
  const tradeName = trade?.company_name ?? "Trade";
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  // Shortening (or unchanged) always frees up capacity, so it's always safe.
  if (newEndDate <= booking.end_date) {
    const { error } = await supabase
      .from("bookings")
      .update({ end_date: newEndDate })
      .eq("id", bookingId);
    if (error) return { ok: false, error: error.message };

    await notifyCreator(supabase, booking.created_by, {
      projectName: projectNameById.get(booking.project_id) ?? "Unknown project",
      tradeName,
      oldStart: booking.start_date,
      oldEnd: booking.end_date,
      newStart: booking.start_date,
      newEnd: newEndDate,
      reason: "was shortened",
    });

    revalidatePath("/schedule");
    return { ok: true };
  }

  // Extending: check the newly-added days against crews, other bookings, and
  // external commitments for this trade.
  const [
    { data: crews },
    { data: otherBookings },
    { data: externalCommitments },
    { data: capacityOverrides },
  ] =
    await Promise.all([
      supabase.from("crews").select("id").eq("trade_id", booking.trade_id).eq("is_active", true),
      supabase
        .from("bookings")
        .select("id, project_id, start_date, end_date, crew_count, created_by")
        .eq("trade_id", booking.trade_id)
        .neq("status", "cancelled")
        .neq("id", bookingId)
        .order("start_date"),
      supabase
        .from("trade_external_commitments")
        .select("start_date, end_date, crew_count")
        .eq("trade_id", booking.trade_id)
        .lte("start_date", newEndDate)
        .gte("end_date", shiftDateKey(booking.end_date, 1)),
      supabase
        .from("trade_capacity_overrides")
        .select("start_date, end_date, total_crews")
        .eq("trade_id", booking.trade_id)
        .lte("start_date", newEndDate)
        .gte("end_date", shiftDateKey(booking.end_date, 1)),
    ]);

  const totalCrews = crews?.length ?? 0;
  const datedTotals = (capacityOverrides ?? []).map((override) => ({
    startDate: override.start_date,
    endDate: override.end_date,
    totalCrews: override.total_crews,
  }));
  const addedDays = dateRange(
    new Date(`${shiftDateKey(booking.end_date, 1)}T00:00:00`),
    diffDays(booking.end_date, newEndDate),
  );

  // External commitments can't be pushed, so they hard-block the extension.
  for (const day of addedDays) {
    const totalForDay = totalCrewsForDate(totalCrews, day, datedTotals);
    const externalOnDay = (externalCommitments ?? [])
      .filter((e) => day >= e.start_date && day <= e.end_date)
      .reduce((sum, e) => sum + e.crew_count, 0);
    if (externalOnDay + booking.crew_count > totalForDay) {
      return {
        ok: false,
        error: `Can't extend into ${day}: this trade already has ${externalOnDay} of ${totalForDay} crew(s) committed elsewhere that day.`,
      };
    }
  }

  // Any other booking for this trade that starts on/after this one and would
  // now overlap the extended range needs to be pushed forward.
  const shifts: BookingShift[] = [];
  const shiftCreators = new Map<string, string | null>();
  let cursor = newEndDate;
  for (const other of (otherBookings ?? []).filter((b) => b.start_date >= booking.start_date)) {
    if (other.start_date > cursor) break;
    const duration = diffDays(other.start_date, other.end_date);
    const newStart = shiftDateKey(cursor, 1);
    const newEnd = shiftDateKey(newStart, duration);
    shifts.push({
      id: other.id,
      label: projectNameById.get(other.project_id) ?? "Unknown project",
      oldStart: other.start_date,
      oldEnd: other.end_date,
      newStart,
      newEnd,
    });
    shiftCreators.set(other.id, other.created_by);
    cursor = newEnd;
  }

  if (shifts.length > 0 && !cascade) {
    return {
      ok: false,
      error: `Extending this booking overlaps with ${shifts.length} other booking${
        shifts.length === 1 ? "" : "s"
      } for this trade.`,
      needsConfirmation: true,
      shifts,
    };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ end_date: newEndDate })
    .eq("id", bookingId);
  if (updateError) return { ok: false, error: updateError.message };

  for (const shift of shifts) {
    const { error } = await supabase
      .from("bookings")
      .update({ start_date: shift.newStart, end_date: shift.newEnd })
      .eq("id", shift.id);
    if (error) {
      return {
        ok: false,
        error: `Extended this booking, but failed to push "${shift.label}" forward: ${error.message}`,
      };
    }
  }

  // Notify whoever originally booked each affected slot that its dates moved.
  await Promise.all([
    notifyCreator(supabase, booking.created_by, {
      projectName: projectNameById.get(booking.project_id) ?? "Unknown project",
      tradeName,
      oldStart: booking.start_date,
      oldEnd: booking.end_date,
      newStart: booking.start_date,
      newEnd: newEndDate,
      reason: "was extended",
    }),
    ...shifts.map((shift) =>
      notifyCreator(supabase, shiftCreators.get(shift.id) ?? null, {
        projectName: shift.label,
        tradeName,
        oldStart: shift.oldStart,
        oldEnd: shift.oldEnd,
        newStart: shift.newStart,
        newEnd: shift.newEnd,
        reason: "was pushed back to make room for another job",
      }),
    ),
  ]);

  revalidatePath("/schedule");
  return { ok: true };
}

async function notifyCreator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  createdBy: string | null,
  details: {
    projectName: string;
    tradeName: string;
    oldStart: string;
    oldEnd: string;
    newStart: string;
    newEnd: string;
    reason: string;
  },
): Promise<void> {
  if (!createdBy) return;
  const { data: creator } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", createdBy)
    .maybeSingle();
  if (!creator?.email) return;

  await sendBookingRescheduledEmail({
    to: creator.email,
    recipientName: creator.full_name || "there",
    ...details,
  });
}

function dayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
