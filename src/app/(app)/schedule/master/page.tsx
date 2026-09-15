import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getBookingCrewMemberAssignments,
  getBookingsForTrade,
  getCurrentProfile,
  getExternalCommitmentCrewMembersForTrade,
  getExternalCommitmentsForTrade,
  getOrCreateCalendarExportToken,
  getProjects,
  getTradeCrewMembers,
} from "@/lib/data";
import { dateRange, diffDays } from "@/lib/capacity";
import {
  MasterScheduleCalendar,
  type MasterScheduleEntry,
} from "@/components/schedule/master-schedule-calendar";
import { CalendarSubscribeCard } from "@/components/schedule/calendar-subscribe-card";

export default async function MasterSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "trade" || !profile.trade_id) {
    redirect("/schedule");
  }
  const tradeId = profile.trade_id;

  const { month: monthParam } = await searchParams;
  const today = new Date();
  const todayKey = toDateKey(today);
  const todayMonthKey = todayKey.slice(0, 7);
  const monthKey = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? (monthParam as string) : todayMonthKey;
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);

  const [bookings, crewMembers, bookingCrewMembers, externalCommitments, externalCommitmentCrewMembers, projects, exportToken] =
    await Promise.all([
      getBookingsForTrade(tradeId),
      getTradeCrewMembers(tradeId),
      getBookingCrewMemberAssignments(tradeId),
      getExternalCommitmentsForTrade(tradeId),
      getExternalCommitmentCrewMembersForTrade(tradeId),
      getProjects(),
      getOrCreateCalendarExportToken(tradeId),
    ]);

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const crewMemberNameById = new Map(crewMembers.map((member) => [member.id, member.name]));

  const entriesByDate: Record<string, MasterScheduleEntry[]> = {};
  function addEntry(entry: MasterScheduleEntry) {
    const days = dateRange(new Date(`${entry.startDate}T00:00:00`), diffDays(entry.startDate, entry.endDate) + 1);
    for (const day of days) {
      (entriesByDate[day] ??= []).push(entry);
    }
  }

  for (const booking of bookings) {
    const crewNames = bookingCrewMembers
      .filter((assignment) => assignment.booking_id === booking.id)
      .map((assignment) => crewMemberNameById.get(assignment.crew_member_id))
      .filter((name): name is string => Boolean(name));
    addEntry({
      id: `booking-${booking.id}`,
      type: "booking",
      label: projectNameById.get(booking.project_id) ?? "Unknown project",
      crewNames,
      status: booking.status === "confirmed" ? "confirmed" : "tentative",
      startDate: booking.start_date,
      endDate: booking.end_date,
    });
  }

  for (const commitment of externalCommitments) {
    const crewNames = externalCommitmentCrewMembers
      .filter((assignment) => assignment.external_commitment_id === commitment.id)
      .map((assignment) => crewMemberNameById.get(assignment.crew_member_id))
      .filter((name): name is string => Boolean(name));
    addEntry({
      id: commitment.id,
      type: commitment.source === "calendar_sync" ? "busy" : "job",
      label: commitment.note || (commitment.source === "calendar_sync" ? "Busy" : "Outside job"),
      crewNames,
      startDate: commitment.start_date,
      endDate: commitment.end_date,
    });
  }

  const feedUrl = await buildAbsoluteFeedUrl(exportToken);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Master Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Every job your crews are working — booked through this app or scheduled by you
          directly — in one calendar.
        </p>
      </div>

      <MasterScheduleCalendar
        monthKey={monthKey}
        prevMonthKey={prevMonthKey}
        nextMonthKey={nextMonthKey}
        todayMonthKey={todayMonthKey}
        todayKey={todayKey}
        entriesByDate={entriesByDate}
        crewMembers={crewMembers}
      />

      <div className="max-w-xl">
        <CalendarSubscribeCard feedUrl={feedUrl} />
      </div>
    </div>
  );
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftMonthKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1 + amount, 1);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

async function buildAbsoluteFeedUrl(token: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}/api/calendar/${token}.ics`;
}
