import Link from "next/link";
import {
  getBookingsForTrade,
  getBookingsInRange,
  getBookingCrewMemberAssignments,
  getCapacityOverridesInRange,
  getAllProfiles,
  getCurrentProfile,
  getExternalCommitmentsInRange,
  getProjects,
  getTradeCategories,
  getTradeCrewMembers,
  getTradesWithDetails,
} from "@/lib/data";
import { buildTradeCapacity, dateRange, toDateKey } from "@/lib/capacity";
import { CapacityBoard, type BoardRow, type BookingDetail } from "@/components/schedule/capacity-board";
import { MyBookingsPanel } from "@/components/schedule/my-bookings-panel";
import { AdminBookingsPanel } from "@/components/schedule/admin-bookings-panel";
import { TradeCrewRoster } from "@/components/schedule/trade-crew-roster";

const WINDOW_DAYS = 14;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start: startParam } = await searchParams;
  const startDate = startParam ? new Date(`${startParam}T00:00:00`) : startOfToday();
  const days = dateRange(startDate, WINDOW_DAYS);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const profile = await getCurrentProfile();
  const isTrade = profile?.role === "trade";

  const [
    categories,
    allTrades,
    projects,
    bookings,
    externalCommitments,
    capacityOverrides,
    profiles,
  ] = await Promise.all([
    getTradeCategories(),
    getTradesWithDetails(),
    getProjects(),
    getBookingsInRange(rangeStart, rangeEnd),
    getExternalCommitmentsInRange(rangeStart, rangeEnd),
    getCapacityOverridesInRange(rangeStart, rangeEnd),
    getAllProfiles(),
  ]);

  // Trades only ever see their own capacity/schedule; internal staff see everyone.
  const trades = isTrade ? allTrades.filter((t) => t.id === profile?.trade_id) : allTrades;

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const profileNameById = new Map(profiles.map((candidate) => [candidate.id, candidate.full_name]));

  const rows: BoardRow[] = trades
    .filter((t) => t.is_active)
    .map((trade) => {
      const totalCrews = trade.crews.filter((c) => c.is_active).length;
      const tradeBookings = bookings.filter((b) => b.trade_id === trade.id);
      const tradeExternal = externalCommitments.filter((e) => e.trade_id === trade.id);
      const tradeOverrides = capacityOverrides.filter((override) => override.trade_id === trade.id);

      const capacityDays = buildTradeCapacity(
        {
          tradeId: trade.id,
          totalCrews,
          overrides: tradeOverrides.map((override) => ({
            startDate: override.start_date,
            endDate: override.end_date,
            totalCrews: override.total_crews,
          })),
          bookings: tradeBookings.map((b) => ({
            startDate: b.start_date,
            endDate: b.end_date,
            status: b.status,
            crewCount: b.crew_count,
          })),
          externalCommitments: tradeExternal.map((e) => ({
            startDate: e.start_date,
            endDate: e.end_date,
            crewCount: e.crew_count,
          })),
        },
        days,
      );

      const bookingsByDate: Record<string, BookingDetail[]> = {};
      for (const day of days) {
        const details: BookingDetail[] = [];
        for (const b of tradeBookings) {
          if (b.status !== "cancelled" && day >= b.start_date && day <= b.end_date) {
            const project = projectById.get(b.project_id);
            details.push({
              id: b.id,
              label: projectNameById.get(b.project_id) ?? "Unknown project",
              projectNumber: project?.project_number ?? null,
              projectLocation: project?.map_link || project?.address || null,
              crewCount: b.crew_count,
              source: "booking",
              status: b.status,
              startDate: b.start_date,
              endDate: b.end_date,
              bookedByName: b.created_by ? profileNameById.get(b.created_by) ?? "Unknown" : "Unknown",
              confirmedByName: b.confirmed_by
                ? profileNameById.get(b.confirmed_by) ?? "Unknown"
                : null,
            });
          }
        }
        for (const e of tradeExternal) {
          if (day >= e.start_date && day <= e.end_date) {
            details.push({
              id: e.id,
              label: e.note || "External commitment",
              projectNumber: null,
              projectLocation: null,
              crewCount: e.crew_count,
              source: "external",
              status: "external",
              startDate: e.start_date,
              endDate: e.end_date,
              bookedByName: null,
              confirmedByName: null,
            });
          }
        }
        bookingsByDate[day] = details;
      }

      return {
        trade,
        totalCrews,
        days: capacityDays,
        bookingsByDate,
      };
    });

  const tradeDashboardData =
    isTrade && profile?.trade_id
      ? await Promise.all([
          getBookingsForTrade(profile.trade_id),
          getTradeCrewMembers(profile.trade_id),
          getBookingCrewMemberAssignments(profile.trade_id),
        ])
      : null;
  const myBookings = tradeDashboardData
      ? tradeDashboardData[0].map((b) => ({
          ...b,
          projectName: projectNameById.get(b.project_id) ?? "Unknown project",
          projectNumber: projects.find((project) => project.id === b.project_id)?.project_number ?? null,
          projectAddress: projects.find((project) => project.id === b.project_id)?.address ?? null,
          projectMapLink: projects.find((project) => project.id === b.project_id)?.map_link ?? null,
          bookedByName: b.created_by ? profileNameById.get(b.created_by) ?? "Unknown" : "Unknown",
        }))
      : null;
  const crewMembers = tradeDashboardData?.[1] ?? [];
  const crewAssignments = tradeDashboardData?.[2] ?? [];

  const tradeNameById = new Map(trades.map((trade) => [trade.id, trade.company_name]));
  const adminBookings =
    profile?.role === "admin"
      ? bookings.map((booking) => ({
          ...booking,
          projectName: projectNameById.get(booking.project_id) ?? "Unknown project",
          tradeName: tradeNameById.get(booking.trade_id) ?? "Unknown trade",
        }))
      : null;

  const prevStart = toDateKey(addDays(startDate, -WINDOW_DAYS));
  const nextStart = toDateKey(addDays(startDate, WINDOW_DAYS));
  const todayStart = toDateKey(startOfToday());

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-background px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">
            {isTrade ? "My Schedule" : "Capacity Schedule"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatRangeLabel(days[0], days[days.length - 1])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/schedule?start=${prevStart}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            ← Prev
          </Link>
          <Link
            href={`/schedule?start=${todayStart}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Today
          </Link>
          <Link
            href={`/schedule?start=${nextStart}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Next →
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 lg:h-[calc(100vh-9rem)] lg:flex-row">
          <div className="min-h-0 lg:flex-1">
            <CapacityBoard
              categories={categories}
              rows={rows}
              days={days}
              projects={projects}
              trades={trades}
              canBook={!isTrade}
            />
          </div>
          {myBookings && (
            <div className="w-full shrink-0 space-y-6 lg:w-96 lg:overflow-y-auto">
              <TradeCrewRoster members={crewMembers} />
              <MyBookingsPanel
                bookings={myBookings}
                crewMembers={crewMembers}
                crewAssignments={crewAssignments}
              />
            </div>
          )}
          {adminBookings && (
            <div className="w-full shrink-0 lg:w-96 lg:overflow-y-auto">
              <AdminBookingsPanel bookings={adminBookings} projects={projects} trades={trades} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function formatRangeLabel(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
