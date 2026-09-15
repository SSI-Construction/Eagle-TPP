import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo/config";
import {
  demoGetBookingsForTrade,
  demoGetExternalCommitmentsForTrade,
  demoGetProjects,
  demoGetTradeIdForExportToken,
  demoGetTradeWithDetailsById,
} from "@/lib/demo/store";
import { buildIcsCalendar, type IcsExportEvent } from "@/lib/ics";

export const dynamic = "force-dynamic";

/**
 * Public, token-authenticated .ics feed — no session required, since
 * external calendar apps (Google/Outlook/Apple) poll this URL directly.
 * Reads with the service-role client (the secret token *is* the auth check),
 * and only ever exposes job names/dates, never crew rosters or contacts.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, "");

  if (isDemoMode()) {
    const tradeId = demoGetTradeIdForExportToken(token);
    if (!tradeId) return new Response("Not found", { status: 404 });

    const trade = demoGetTradeWithDetailsById(tradeId);
    const bookings = demoGetBookingsForTrade(tradeId);
    const externalCommitments = demoGetExternalCommitmentsForTrade(tradeId);
    const projects = demoGetProjects();
    return icsResponse(trade?.company_name ?? null, bookings, externalCommitments, projects);
  }

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("trade_calendar_export_tokens")
    .select("trade_id")
    .eq("token", token)
    .maybeSingle();
  const tradeId = tokenRow?.trade_id;
  if (!tradeId) return new Response("Not found", { status: 404 });

  const [{ data: trade }, { data: bookings }, { data: externalCommitments }, { data: projects }] =
    await Promise.all([
      admin.from("trades").select("company_name").eq("id", tradeId).maybeSingle(),
      admin
        .from("bookings")
        .select("id, project_id, start_date, end_date, status")
        .eq("trade_id", tradeId)
        .neq("status", "cancelled"),
      admin
        .from("trade_external_commitments")
        .select("id, note, start_date, end_date, source")
        .eq("trade_id", tradeId),
      admin.from("projects").select("id, name"),
    ]);

  return icsResponse(trade?.company_name ?? null, bookings ?? [], externalCommitments ?? [], projects ?? []);
}

function icsResponse(
  companyName: string | null,
  bookings: { id: string; project_id: string; start_date: string; end_date: string; status: string }[],
  externalCommitments: { id: string; note: string | null; start_date: string; end_date: string; source: string }[],
  projects: { id: string; name: string }[],
): Response {
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

  const events: IcsExportEvent[] = [
    ...bookings.map((booking) => ({
      uid: `booking-${booking.id}@trade-schedule`,
      title: projectNameById.get(booking.project_id) ?? "Booked job",
      startDate: booking.start_date,
      endDate: booking.end_date,
      description: booking.status === "tentative" ? "Requested — not yet confirmed" : "Confirmed",
    })),
    // Calendar-synced entries came *from* an external calendar — re-exporting them would loop back.
    ...externalCommitments
      .filter((commitment) => commitment.source === "manual")
      .map((commitment) => ({
        uid: `job-${commitment.id}@trade-schedule`,
        title: commitment.note || "Outside job",
        startDate: commitment.start_date,
        endDate: commitment.end_date,
      })),
  ];

  const ics = buildIcsCalendar(companyName ? `${companyName} Schedule` : "Trade Schedule", events);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="trade-schedule.ics"',
      "Cache-Control": "no-store",
    },
  });
}
