import { dateRange, diffDays, shiftDateKey, toDateKey, totalCrewsForDate } from "@/lib/capacity";
import {
  sendBookingCreatedEmail,
  sendBookingRescheduledEmail,
  sendChangeRequestDecisionEmail,
  sendChangeRequestEmail,
} from "@/lib/email";
import type {
  Booking,
  BookingChangeRequest,
  BookingCrewMember,
  CapacityOverride,
  Crew,
  ExternalCommitment,
  ExternalCommitmentCrewMember,
  Profile,
  Project,
  Trade,
  TradeCategory,
  TradeCrewMember,
  TradeWithDetails,
} from "@/lib/data";
import type { BookingRequestType, UserRole } from "@/lib/database.types";

// In-memory demo dataset so the UI can be explored (and screenshotted) before
// any Supabase project/migration exists. Resets whenever the dev server
// restarts. Never used unless NEXT_PUBLIC_DEMO_MODE=true (see lib/demo/config.ts).

const today = toDateKey(new Date());
const d = (offset: number) => shiftDateKey(today, offset);
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const seedCategories: TradeCategory[] = [
  { id: "cat-sitework", name: "Site Work / Excavation", sort_order: 10 },
  { id: "cat-foundation", name: "Foundation", sort_order: 20 },
  { id: "cat-slabprep", name: "Slab Prep", sort_order: 30 },
  { id: "cat-slabpour", name: "Slab Pour / Concrete", sort_order: 40 },
  { id: "cat-framing", name: "Framing - Structural", sort_order: 50 },
  { id: "cat-roofframing", name: "Roof Framing", sort_order: 60 },
  { id: "cat-roofing", name: "Roofing", sort_order: 70 },
  { id: "cat-plumbing", name: "Plumbing", sort_order: 80 },
  { id: "cat-electrical", name: "Electrical", sort_order: 90 },
  { id: "cat-hvac", name: "HVAC", sort_order: 100 },
  { id: "cat-firesuppression", name: "Fire Suppression", sort_order: 110 },
  { id: "cat-insulation", name: "Insulation", sort_order: 120 },
  { id: "cat-drywall", name: "Drywall", sort_order: 130 },
  { id: "cat-painting", name: "Painting", sort_order: 140 },
  { id: "cat-flooring", name: "Flooring", sort_order: 150 },
  { id: "cat-landscaping", name: "Landscaping", sort_order: 180 },
  { id: "cat-paving", name: "Paving / Concrete Flatwork", sort_order: 190 },
];

const seedTrades: Trade[] = (
  [
    { id: "t-electrical", company_name: "Apex Electrical", phone: "555-0101", email: "dispatch@apexelectrical.example", notes: null, is_active: true, created_at: today },
    { id: "t-plumbing", company_name: "Summit Plumbing", phone: "555-0102", email: "office@summitplumbing.example", notes: null, is_active: true, created_at: today },
    { id: "t-hvac", company_name: "Coastal HVAC", phone: "555-0103", email: "info@coastalhvac.example", notes: null, is_active: true, created_at: today },
    { id: "t-framing", company_name: "Ironclad Framing", phone: "555-0104", email: "jobs@ironcladframing.example", notes: null, is_active: true, created_at: today },
    { id: "t-concrete", company_name: "Precision Concrete", phone: "555-0105", email: "scheduling@precisionconcrete.example", notes: null, is_active: true, created_at: today },
    { id: "t-painting", company_name: "BrightCoat Painting", phone: "555-0106", email: "hello@brightcoat.example", notes: null, is_active: true, created_at: today },
    { id: "t-fire", company_name: "SafeGuard Fire Suppression", phone: "555-0107", email: "ops@safeguardfire.example", notes: null, is_active: true, created_at: today },
    { id: "t-roofing", company_name: "TopLine Roofing", phone: "555-0108", email: "crew@toplineroofing.example", notes: null, is_active: true, created_at: today },
    { id: "t-drywall", company_name: "ClearView Drywall", phone: "555-0109", email: "schedule@clearviewdrywall.example", notes: null, is_active: true, created_at: today },
    { id: "t-landscaping", company_name: "GreenScape Landscaping", phone: "555-0110", email: "team@greenscape.example", notes: null, is_active: true, created_at: today },
  ] as Omit<Trade, "ics_feed_url" | "ics_synced_at">[]
).map((trade) => ({ ...trade, ics_feed_url: null, ics_synced_at: null }));


const seedCategoryLinks: { trade_id: string; category_id: string }[] = [
  { trade_id: "t-electrical", category_id: "cat-electrical" },
  { trade_id: "t-plumbing", category_id: "cat-plumbing" },
  { trade_id: "t-hvac", category_id: "cat-hvac" },
  { trade_id: "t-framing", category_id: "cat-framing" },
  { trade_id: "t-framing", category_id: "cat-roofframing" },
  { trade_id: "t-concrete", category_id: "cat-slabprep" },
  { trade_id: "t-concrete", category_id: "cat-slabpour" },
  { trade_id: "t-concrete", category_id: "cat-paving" },
  { trade_id: "t-painting", category_id: "cat-painting" },
  { trade_id: "t-fire", category_id: "cat-firesuppression" },
  { trade_id: "t-roofing", category_id: "cat-roofing" },
  { trade_id: "t-drywall", category_id: "cat-drywall" },
  { trade_id: "t-drywall", category_id: "cat-insulation" },
  { trade_id: "t-landscaping", category_id: "cat-landscaping" },
];

const seedCrews: Crew[] = [
  { id: "crew-elec-1", trade_id: "t-electrical", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-elec-2", trade_id: "t-electrical", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-elec-3", trade_id: "t-electrical", name: "Crew C", is_active: true, created_at: today },
  { id: "crew-plumb-1", trade_id: "t-plumbing", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-plumb-2", trade_id: "t-plumbing", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-hvac-1", trade_id: "t-hvac", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-hvac-2", trade_id: "t-hvac", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-framing-1", trade_id: "t-framing", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-framing-2", trade_id: "t-framing", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-framing-3", trade_id: "t-framing", name: "Crew C", is_active: true, created_at: today },
  { id: "crew-framing-4", trade_id: "t-framing", name: "Crew D (seasonal)", is_active: false, created_at: today },
  { id: "crew-concrete-1", trade_id: "t-concrete", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-concrete-2", trade_id: "t-concrete", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-concrete-3", trade_id: "t-concrete", name: "Crew C", is_active: true, created_at: today },
  { id: "crew-paint-1", trade_id: "t-painting", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-paint-2", trade_id: "t-painting", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-fire-1", trade_id: "t-fire", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-roof-1", trade_id: "t-roofing", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-roof-2", trade_id: "t-roofing", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-drywall-1", trade_id: "t-drywall", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-drywall-2", trade_id: "t-drywall", name: "Crew B", is_active: true, created_at: today },
  { id: "crew-drywall-3", trade_id: "t-drywall", name: "Crew C", is_active: true, created_at: today },
  { id: "crew-land-1", trade_id: "t-landscaping", name: "Crew A", is_active: true, created_at: today },
  { id: "crew-land-2", trade_id: "t-landscaping", name: "Crew B", is_active: true, created_at: today },
];

const PROFILE_PM_ID = "demo-pm";
const PROFILE_SUPER_ID = "demo-super";

const seedProjects: Project[] = [
  { id: "p-maple", name: "Maple Ridge Apartments", project_number: "24018", address: "410 Maple Ridge Rd", map_link: null, pm_id: PROFILE_PM_ID, site_supervisor_id: PROFILE_SUPER_ID, start_date: d(-30), end_date: d(120), is_active: true, created_at: today },
  { id: "p-harbor", name: "Harbor View Office Tower", project_number: "24031", address: "88 Harbor View Blvd", map_link: null, pm_id: PROFILE_PM_ID, site_supervisor_id: PROFILE_SUPER_ID, start_date: d(-60), end_date: d(200), is_active: true, created_at: today },
  { id: "p-lincoln", name: "Lincoln Elementary Addition", project_number: "25004", address: "1500 Lincoln Ave", map_link: null, pm_id: PROFILE_PM_ID, site_supervisor_id: PROFILE_SUPER_ID, start_date: d(-10), end_date: d(90), is_active: true, created_at: today },
  { id: "p-riverside", name: "Riverside Medical Center", project_number: "24027", address: "7 Riverside Pkwy", map_link: null, pm_id: PROFILE_PM_ID, site_supervisor_id: PROFILE_SUPER_ID, start_date: d(-45), end_date: d(150), is_active: true, created_at: today },
  { id: "p-summit", name: "Summit Business Park", project_number: "25011", address: "220 Summit Dr", map_link: null, pm_id: PROFILE_PM_ID, site_supervisor_id: PROFILE_SUPER_ID, start_date: d(-20), end_date: d(100), is_active: true, created_at: today },
];

const seedProfiles: Profile[] = [
  { id: "demo-admin", full_name: "Alex Admin", email: "alex.admin@example.com", role: "admin", trade_id: null, created_at: today },
  { id: PROFILE_PM_ID, full_name: "Paula Manager", email: "paula.manager@example.com", role: "pm", trade_id: null, created_at: today },
  { id: PROFILE_SUPER_ID, full_name: "Sam Supervisor", email: "sam.supervisor@example.com", role: "site_supervisor", trade_id: null, created_at: today },
  { id: "demo-trade", full_name: "Terry Volt (Apex Electrical)", email: "terry@apexelectrical.example", role: "trade", trade_id: "t-electrical", created_at: today },
  { id: "demo-precast", full_name: "Pat Precast", email: "pat.precast@example.com", role: "precast", trade_id: null, created_at: today },
  { id: "demo-safety", full_name: "Sasha Safety", email: "sasha.safety@example.com", role: "safety", trade_id: null, created_at: today },
];

const seedBookingsWithoutConfirmation: Array<Omit<Booking, "confirmed_by" | "confirmed_at">> = [
  // Apex Electrical: a sequential run of jobs — good for demoing shorten/extend/push-forward.
  { id: "b-elec-1", project_id: "p-maple", trade_id: "t-electrical", crew_id: null, crew_count: 1, start_date: d(-2), end_date: d(1), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },
  { id: "b-elec-2", project_id: "p-harbor", trade_id: "t-electrical", crew_id: null, crew_count: 2, start_date: d(2), end_date: d(4), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },
  { id: "b-elec-3", project_id: "p-lincoln", trade_id: "t-electrical", crew_id: null, crew_count: 1, start_date: d(5), end_date: d(8), status: "confirmed", notes: null, created_by: PROFILE_SUPER_ID, created_at: today },

  { id: "b-plumb-1", project_id: "p-riverside", trade_id: "t-plumbing", crew_id: null, crew_count: 2, start_date: d(-1), end_date: d(3), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },

  { id: "b-hvac-1", project_id: "p-summit", trade_id: "t-hvac", crew_id: null, crew_count: 1, start_date: d(1), end_date: d(6), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },
  { id: "b-hvac-2", project_id: "p-maple", trade_id: "t-hvac", crew_id: null, crew_count: 1, start_date: d(3), end_date: d(5), status: "confirmed", notes: null, created_by: PROFILE_SUPER_ID, created_at: today },

  // Ironclad Framing: overlapping bookings intentionally exceed 3 active crews to show the "overbooked" state.
  { id: "b-framing-1", project_id: "p-harbor", trade_id: "t-framing", crew_id: null, crew_count: 2, start_date: d(-3), end_date: d(2), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },
  { id: "b-framing-2", project_id: "p-riverside", trade_id: "t-framing", crew_id: null, crew_count: 2, start_date: d(1), end_date: d(3), status: "confirmed", notes: "Double-booked - needs resolving", created_by: PROFILE_SUPER_ID, created_at: today },
  { id: "b-framing-3", project_id: "p-lincoln", trade_id: "t-framing", crew_id: null, crew_count: 2, start_date: d(4), end_date: d(10), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },

  { id: "b-concrete-1", project_id: "p-maple", trade_id: "t-concrete", crew_id: null, crew_count: 1, start_date: d(0), end_date: d(4), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },

  { id: "b-paint-1", project_id: "p-summit", trade_id: "t-painting", crew_id: null, crew_count: 1, start_date: d(-5), end_date: d(-1), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },

  { id: "b-roof-1", project_id: "p-harbor", trade_id: "t-roofing", crew_id: null, crew_count: 1, start_date: d(4), end_date: d(9), status: "confirmed", notes: null, created_by: PROFILE_SUPER_ID, created_at: today },

  { id: "b-drywall-1", project_id: "p-lincoln", trade_id: "t-drywall", crew_id: null, crew_count: 2, start_date: d(2), end_date: d(7), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },

  { id: "b-land-1", project_id: "p-summit", trade_id: "t-landscaping", crew_id: null, crew_count: 1, start_date: d(6), end_date: d(12), status: "confirmed", notes: null, created_by: PROFILE_PM_ID, created_at: today },
];

const seedBookings: Booking[] = seedBookingsWithoutConfirmation.map((booking) => ({
  ...booking,
  confirmed_by: booking.status === "confirmed" ? "demo-trade" : null,
  confirmed_at: booking.status === "confirmed" ? today : null,
}));

const seedExternalCommitments: ExternalCommitment[] = [
  { id: "ec-concrete-1", trade_id: "t-concrete", crew_count: 2, start_date: d(2), end_date: d(6), note: "Other GC job (Westside Plaza)", created_at: today, source: "manual", external_uid: null },
];

const seedCapacityOverrides: CapacityOverride[] = [];

const seedTradeCrewMembers: TradeCrewMember[] = [
  { id: "member-elec-1", trade_id: "t-electrical", name: "Dana Ortiz", role: "Foreperson", is_active: true, created_at: today },
  { id: "member-elec-2", trade_id: "t-electrical", name: "Luis Chen", role: "Electrician", is_active: true, created_at: today },
  { id: "member-elec-3", trade_id: "t-electrical", name: "Maya Brooks", role: "Apprentice", is_active: true, created_at: today },
];

const seedBookingCrewMembers: BookingCrewMember[] = [
  { booking_id: "b-elec-1", crew_member_id: "member-elec-1", assigned_at: today },
  { booking_id: "b-elec-1", crew_member_id: "member-elec-2", assigned_at: today },
];

// One example in each direction so the notifications dropdown has something
// to show right away when exploring the demo.
const seedChangeRequests: BookingChangeRequest[] = [
  {
    id: "req-elec-2-reschedule",
    booking_id: "b-elec-2",
    trade_id: "t-electrical",
    project_name: "Harbor View Office Tower",
    trade_name: "Apex Electrical",
    request_type: "reschedule",
    status: "pending",
    requested_by: PROFILE_PM_ID,
    requested_by_name: "Paula Manager",
    requested_by_role: "pm",
    current_start_date: d(2),
    current_end_date: d(4),
    proposed_start_date: d(3),
    proposed_end_date: d(6),
    reason: "Site isn't ready until the extra concrete cures.",
    created_at: today,
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
  },
  {
    id: "req-elec-3-cancel",
    booking_id: "b-elec-3",
    trade_id: "t-electrical",
    project_name: "Lincoln Elementary Addition",
    trade_name: "Apex Electrical",
    request_type: "cancel",
    status: "pending",
    requested_by: "demo-trade",
    requested_by_name: "Terry Volt (Apex Electrical)",
    requested_by_role: "trade",
    current_start_date: d(5),
    current_end_date: d(8),
    proposed_start_date: null,
    proposed_end_date: null,
    reason: "Crew got pulled onto an emergency job.",
    created_at: today,
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
  },
];

// ---------------------------------------------------------------------------
// Mutable in-memory state (deep-cloned from seed so re-imports don't share refs)
// ---------------------------------------------------------------------------

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const categories = clone(seedCategories);
const trades = clone(seedTrades);
const categoryLinks = clone(seedCategoryLinks);
const crews = clone(seedCrews);
const projects = clone(seedProjects);
const profiles = clone(seedProfiles);
const bookings = clone(seedBookings);
let externalCommitments = clone(seedExternalCommitments);
let capacityOverrides = clone(seedCapacityOverrides);
const tradeCrewMembers = clone(seedTradeCrewMembers);
let bookingCrewMembers = clone(seedBookingCrewMembers);
const changeRequests = clone(seedChangeRequests);
let externalCommitmentCrewMembers: ExternalCommitmentCrewMember[] = [];

function tradeWithDetails(trade: Trade): TradeWithDetails {
  return {
    ...trade,
    categoryIds: categoryLinks.filter((l) => l.trade_id === trade.id).map((l) => l.category_id),
    crews: crews.filter((c) => c.trade_id === trade.id),
  };
}

function overlapsRange(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getProfileForRole(role: string): Profile {
  return profiles.find((p) => p.role === role) ?? profiles[1];
}

export function demoGetTradeCategories(): TradeCategory[] {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order);
}

export function demoGetTradesWithDetails(): TradeWithDetails[] {
  return [...trades]
    .sort((a, b) => a.company_name.localeCompare(b.company_name))
    .map(tradeWithDetails);
}

export function demoGetTradeWithDetailsById(tradeId: string): TradeWithDetails | null {
  const trade = trades.find((t) => t.id === tradeId);
  return trade ? tradeWithDetails(trade) : null;
}

export function demoGetTradeIcsUrl(tradeId: string): string | null {
  return trades.find((t) => t.id === tradeId)?.ics_feed_url ?? null;
}

export function demoGetProjects(): Project[] {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}

export function demoGetAllProfiles(): Profile[] {
  return [...profiles].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function demoInviteStaff(input: {
  fullName: string;
  email: string;
  role: Extract<UserRole, "pm" | "site_supervisor" | "precast" | "safety">;
}): DemoActionResult {
  if (profiles.some((profile) => profile.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: "A user with this email already exists." };
  }
  profiles.push({
    id: uid("profile"),
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    trade_id: null,
    created_at: toDateKey(new Date()),
  });
  return { ok: true };
}

export function demoUpdateProfileRole(input: {
  profileId: string;
  role: UserRole;
  tradeId?: string;
}): DemoActionResult {
  const profile = profiles.find((p) => p.id === input.profileId);
  if (!profile) return { ok: false, error: "User not found." };
  profile.role = input.role;
  profile.trade_id = input.role === "trade" ? input.tradeId ?? null : null;
  return { ok: true };
}

export function demoGetBookingsInRange(startDate: string, endDate: string): Booking[] {
  return bookings.filter((b) => overlapsRange(b.start_date, b.end_date, startDate, endDate));
}

export function demoGetExternalCommitmentsInRange(
  startDate: string,
  endDate: string,
): ExternalCommitment[] {
  return externalCommitments.filter((e) => overlapsRange(e.start_date, e.end_date, startDate, endDate));
}

export function demoGetCapacityOverridesInRange(
  startDate: string,
  endDate: string,
): CapacityOverride[] {
  return capacityOverrides.filter((override) =>
    overlapsRange(override.start_date, override.end_date, startDate, endDate),
  );
}

export function demoGetBookingsForTrade(tradeId: string): Booking[] {
  return bookings
    .filter((b) => b.trade_id === tradeId && b.status !== "cancelled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function demoGetBookingsForProject(projectId: string): Booking[] {
  return bookings
    .filter((b) => b.project_id === projectId && b.status !== "cancelled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function demoGetTradeCrewMembers(tradeId: string): TradeCrewMember[] {
  return tradeCrewMembers
    .filter((member) => member.trade_id === tradeId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function demoGetBookingCrewMemberAssignments(tradeId: string): BookingCrewMember[] {
  const memberIds = new Set(
    tradeCrewMembers.filter((member) => member.trade_id === tradeId).map((member) => member.id),
  );
  return bookingCrewMembers.filter((assignment) => memberIds.has(assignment.crew_member_id));
}

export function demoConfirmBooking(
  bookingId: string,
  requesterTradeId: string | null,
  confirmedBy: string,
): DemoActionResult {
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking || booking.status === "cancelled") {
    return { ok: false, error: "Booking request not found." };
  }
  if (!requesterTradeId || booking.trade_id !== requesterTradeId) {
    return { ok: false, error: "You can only confirm requests for your own trade." };
  }
  if (booking.status !== "tentative") {
    return { ok: false, error: "This booking is already confirmed." };
  }
  booking.status = "confirmed";
  booking.confirmed_by = confirmedBy;
  booking.confirmed_at = new Date().toISOString();
  return { ok: true };
}

export function demoGetExternalCommitmentsForTrade(tradeId: string): ExternalCommitment[] {
  return externalCommitments
    .filter((e) => e.trade_id === tradeId)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function demoGetExternalCommitmentCrewMembersForTrade(
  tradeId: string,
): ExternalCommitmentCrewMember[] {
  const memberIds = new Set(
    tradeCrewMembers.filter((member) => member.trade_id === tradeId).map((member) => member.id),
  );
  return externalCommitmentCrewMembers.filter((assignment) => memberIds.has(assignment.crew_member_id));
}

export function demoGetOrCreateCalendarExportToken(tradeId: string): string {
  // Derived (not stored) so it still resolves even if the API route handler
  // ends up with its own module instance of this in-memory store in dev.
  return `demo-${tradeId}`;
}

export function demoGetTradeIdForExportToken(token: string): string | null {
  if (!token.startsWith("demo-")) return null;
  const tradeId = token.slice("demo-".length);
  return trades.some((trade) => trade.id === tradeId) ? tradeId : null;
}

export function demoGetCapacityOverridesForTrade(tradeId: string): CapacityOverride[] {
  return capacityOverrides
    .filter((override) => override.trade_id === tradeId)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function demoGetPendingChangeRequests(): BookingChangeRequest[] {
  return changeRequests
    .filter((request) => request.status === "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type DemoActionResult =
  | { ok: true }
  | { ok: false; error: string; needsConfirmation?: boolean; shifts?: BookingShiftPreview[] };

export interface BookingShiftPreview {
  id: string;
  label: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

function totalActiveCrews(tradeId: string): number {
  return crews.filter((c) => c.trade_id === tradeId && c.is_active).length;
}

function totalCrewsOnDate(tradeId: string, date: string): number {
  return totalCrewsForDate(
    totalActiveCrews(tradeId),
    date,
    capacityOverrides
      .filter((override) => override.trade_id === tradeId)
      .map((override) => ({
        startDate: override.start_date,
        endDate: override.end_date,
        totalCrews: override.total_crews,
      })),
  );
}

export async function demoCreateBooking(input: {
  projectId: string;
  tradeId: string;
  startDate: string;
  endDate: string;
  crewCount: number;
  notes?: string;
  createdBy: string;
  bookedByName: string;
}): Promise<DemoActionResult> {
  const days = dateRange(
    new Date(`${input.startDate}T00:00:00`),
    diffDays(input.startDate, input.endDate) + 1,
  );

  const conflictDays = days.filter((day) => {
    const booked =
      bookings
        .filter((b) => b.trade_id === input.tradeId && b.status !== "cancelled" && day >= b.start_date && day <= b.end_date)
        .reduce((sum, b) => sum + b.crew_count, 0) +
      externalCommitments
        .filter((e) => e.trade_id === input.tradeId && day >= e.start_date && day <= e.end_date)
        .reduce((sum, e) => sum + e.crew_count, 0);
    return booked + input.crewCount > totalCrewsOnDate(input.tradeId, day);
  });

  if (conflictDays.length > 0) {
    return {
      ok: false,
      error: `Not enough crew capacity on ${conflictDays.length} day(s). This trade doesn't have ${input.crewCount} free crew(s) for the full date range.`,
    };
  }

  bookings.push({
    id: uid("booking"),
    project_id: input.projectId,
    trade_id: input.tradeId,
    crew_id: null,
    crew_count: input.crewCount,
    start_date: input.startDate,
    end_date: input.endDate,
    status: "tentative",
    notes: input.notes || null,
    created_by: input.createdBy,
    created_at: toDateKey(new Date()),
    confirmed_by: null,
    confirmed_at: null,
  });

  const trade = trades.find((t) => t.id === input.tradeId);
  if (trade?.email) {
    const project = projects.find((item) => item.id === input.projectId);
    await sendBookingCreatedEmail({
      to: trade.email,
      tradeName: trade.company_name,
      projectName: project?.name ?? "Unknown project",
      projectNumber: project?.project_number ?? null,
      projectLocation: project?.map_link || project?.address || null,
      bookedByName: input.bookedByName,
      startDate: input.startDate,
      endDate: input.endDate,
      crewCount: input.crewCount,
    });
  }

  return { ok: true };
}

export function demoCancelBooking(bookingId: string): DemoActionResult {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  booking.status = "cancelled";
  return { ok: true };
}

export function demoUpdateBooking(input: {
  bookingId: string;
  projectId: string;
  tradeId: string;
  startDate: string;
  endDate: string;
  crewCount: number;
  status: "tentative" | "confirmed" | "cancelled";
  notes?: string;
  updatedBy: string;
}): DemoActionResult {
  const booking = bookings.find((item) => item.id === input.bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };

  if (input.status !== "cancelled") {
    const days = dateRange(
      new Date(`${input.startDate}T00:00:00`),
      diffDays(input.startDate, input.endDate) + 1,
    );
    const hasConflict = days.some((day) => {
      const used =
        bookings
          .filter(
            (item) =>
              item.id !== input.bookingId &&
              item.trade_id === input.tradeId &&
              item.status !== "cancelled" &&
              day >= item.start_date &&
              day <= item.end_date,
          )
          .reduce((sum, item) => sum + item.crew_count, 0) +
        externalCommitments
          .filter(
            (item) =>
              item.trade_id === input.tradeId && day >= item.start_date && day <= item.end_date,
          )
          .reduce((sum, item) => sum + item.crew_count, 0);
      return used + input.crewCount > totalCrewsOnDate(input.tradeId, day);
    });
    if (hasConflict) {
      return { ok: false, error: "The updated booking exceeds available capacity." };
    }
  }

  const wasConfirmed = booking.status === "confirmed";
  Object.assign(booking, {
    project_id: input.projectId,
    trade_id: input.tradeId,
    start_date: input.startDate,
    end_date: input.endDate,
    crew_count: input.crewCount,
    status: input.status,
    notes: input.notes || null,
    confirmed_by:
      input.status === "confirmed" ? (wasConfirmed ? booking.confirmed_by : input.updatedBy) : null,
    confirmed_at:
      input.status === "confirmed" ? (wasConfirmed ? booking.confirmed_at : new Date().toISOString()) : null,
  });
  return { ok: true };
}

async function notifyDemoCreator(
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
  const creator = createdBy ? profiles.find((p) => p.id === createdBy) : undefined;
  if (!creator?.email) return;
  await sendBookingRescheduledEmail({
    to: creator.email,
    recipientName: creator.full_name || "there",
    ...details,
  });
}

export async function demoUpdateBookingEndDate(input: {
  bookingId: string;
  newEndDate: string;
  cascade?: boolean;
  requesterRole: string;
  requesterTradeId: string | null;
}): Promise<DemoActionResult> {
  const booking = bookings.find((b) => b.id === input.bookingId);
  if (!booking || booking.status === "cancelled") {
    return { ok: false, error: "Booking not found." };
  }

  // Only the trade itself (for its own work) or an admin can move dates — PMs and
  // site supervisors can book available slots but can't reschedule already-booked work.
  const canEdit =
    input.requesterRole === "admin" ||
    (input.requesterRole === "trade" && input.requesterTradeId === booking.trade_id);
  if (!canEdit) {
    return { ok: false, error: "Only the trade or an admin can change booking dates." };
  }

  if (input.newEndDate < booking.start_date) {
    return { ok: false, error: "End date can't be before the start date." };
  }

  const tradeName = trades.find((t) => t.id === booking.trade_id)?.company_name ?? "Trade";
  const projectName = projects.find((p) => p.id === booking.project_id)?.name ?? "Unknown project";

  if (input.newEndDate <= booking.end_date) {
    const oldEnd = booking.end_date;
    booking.end_date = input.newEndDate;
    await notifyDemoCreator(booking.created_by, {
      projectName,
      tradeName,
      oldStart: booking.start_date,
      oldEnd,
      newStart: booking.start_date,
      newEnd: input.newEndDate,
      reason: "was shortened",
    });
    return { ok: true };
  }

  const addedDays = dateRange(
    new Date(`${shiftDateKey(booking.end_date, 1)}T00:00:00`),
    diffDays(booking.end_date, input.newEndDate),
  );

  for (const day of addedDays) {
    const total = totalCrewsOnDate(booking.trade_id, day);
    const externalOnDay = externalCommitments
      .filter((e) => e.trade_id === booking.trade_id && day >= e.start_date && day <= e.end_date)
      .reduce((sum, e) => sum + e.crew_count, 0);
    if (externalOnDay + booking.crew_count > total) {
      return {
        ok: false,
        error: `Can't extend into ${day}: this trade already has ${externalOnDay} of ${total} crew(s) committed elsewhere that day.`,
      };
    }
  }

  const others = bookings
    .filter((b) => b.trade_id === booking.trade_id && b.status !== "cancelled" && b.id !== booking.id && b.start_date >= booking.start_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const shifts: BookingShiftPreview[] = [];
  const shiftCreators = new Map<string, string | null>();
  let cursor = input.newEndDate;
  for (const other of others) {
    if (other.start_date > cursor) break;
    const duration = diffDays(other.start_date, other.end_date);
    const newStart = shiftDateKey(cursor, 1);
    const newEnd = shiftDateKey(newStart, duration);
    shifts.push({
      id: other.id,
      label: projects.find((p) => p.id === other.project_id)?.name ?? "Unknown project",
      oldStart: other.start_date,
      oldEnd: other.end_date,
      newStart,
      newEnd,
    });
    shiftCreators.set(other.id, other.created_by);
    cursor = newEnd;
  }

  if (shifts.length > 0 && !input.cascade) {
    return {
      ok: false,
      error: `Extending this booking overlaps with ${shifts.length} other booking${shifts.length === 1 ? "" : "s"} for this trade.`,
      needsConfirmation: true,
      shifts,
    };
  }

  const oldEnd = booking.end_date;
  booking.end_date = input.newEndDate;
  for (const shift of shifts) {
    const target = bookings.find((b) => b.id === shift.id);
    if (target) {
      target.start_date = shift.newStart;
      target.end_date = shift.newEnd;
    }
  }

  await Promise.all([
    notifyDemoCreator(booking.created_by, {
      projectName,
      tradeName,
      oldStart: booking.start_date,
      oldEnd,
      newStart: booking.start_date,
      newEnd: input.newEndDate,
      reason: "was extended",
    }),
    ...shifts.map((shift) =>
      notifyDemoCreator(shiftCreators.get(shift.id) ?? null, {
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

  return { ok: true };
}

export type ChangeRequestResult = { ok: true } | { ok: false; error: string };

export async function demoRequestBookingChange(input: {
  bookingId: string;
  requestType: BookingRequestType;
  proposedStartDate?: string;
  proposedEndDate?: string;
  reason?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  requesterTradeId: string | null;
}): Promise<ChangeRequestResult> {
  const booking = bookings.find((b) => b.id === input.bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== "confirmed") {
    return { ok: false, error: "Only confirmed bookings can have a change request." };
  }

  const isStaff = ["admin", "pm", "site_supervisor"].includes(input.requestedByRole);
  if (!isStaff && booking.trade_id !== input.requesterTradeId) {
    return { ok: false, error: "You can only request changes for your own trade's bookings." };
  }

  if (changeRequests.some((r) => r.booking_id === input.bookingId && r.status === "pending")) {
    return { ok: false, error: "There's already a pending request for this booking." };
  }

  if (
    input.requestType === "reschedule" &&
    input.proposedStartDate === booking.start_date &&
    input.proposedEndDate === booking.end_date
  ) {
    return { ok: false, error: "Proposed dates match the current booking dates." };
  }

  const trade = trades.find((t) => t.id === booking.trade_id);
  const project = projects.find((p) => p.id === booking.project_id);
  const tradeName = trade?.company_name ?? "Trade";
  const projectName = project?.name ?? "Unknown project";

  changeRequests.push({
    id: uid("req"),
    booking_id: booking.id,
    trade_id: booking.trade_id,
    project_name: projectName,
    trade_name: tradeName,
    request_type: input.requestType,
    status: "pending",
    requested_by: input.requestedBy,
    requested_by_name: input.requestedByName,
    requested_by_role: input.requestedByRole,
    current_start_date: booking.start_date,
    current_end_date: booking.end_date,
    proposed_start_date: input.requestType === "reschedule" ? input.proposedStartDate ?? null : null,
    proposed_end_date: input.requestType === "reschedule" ? input.proposedEndDate ?? null : null,
    reason: input.reason || null,
    created_at: new Date().toISOString(),
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
  });

  const emailPayload = {
    requestedByName: input.requestedByName,
    projectName,
    requestType: input.requestType,
    currentStart: booking.start_date,
    currentEnd: booking.end_date,
    proposedStart: input.proposedStartDate ?? null,
    proposedEnd: input.proposedEndDate ?? null,
    reason: input.reason ?? null,
  };

  if (isStaff) {
    if (trade?.email) {
      await sendChangeRequestEmail({ to: trade.email, recipientName: tradeName, ...emailPayload });
    }
  } else {
    const creator = booking.created_by ? profiles.find((p) => p.id === booking.created_by) : undefined;
    if (creator?.email) {
      await sendChangeRequestEmail({
        to: creator.email,
        recipientName: creator.full_name || "there",
        ...emailPayload,
      });
    }
  }

  return { ok: true };
}

export async function demoRespondToChangeRequest(input: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
  responderId: string;
  responderName: string;
  responderRole: UserRole;
  responderTradeId: string | null;
}): Promise<ChangeRequestResult> {
  const request = changeRequests.find((r) => r.id === input.requestId);
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "pending") {
    return { ok: false, error: "This request has already been resolved." };
  }

  const isStaff = ["admin", "pm", "site_supervisor"].includes(input.responderRole);
  const canRespond =
    request.requested_by_role === "trade"
      ? isStaff
      : input.responderRole === "trade" && input.responderTradeId === request.trade_id;
  if (!canRespond) {
    return { ok: false, error: "You aren't able to respond to this request." };
  }

  request.status = input.decision;
  request.resolved_by = input.responderId;
  request.resolved_at = new Date().toISOString();
  request.resolution_note = input.note || null;

  if (input.decision === "approved") {
    const booking = bookings.find((b) => b.id === request.booking_id);
    if (booking) {
      if (request.request_type === "cancel") {
        booking.status = "cancelled";
      } else if (request.proposed_start_date && request.proposed_end_date) {
        booking.start_date = request.proposed_start_date;
        booking.end_date = request.proposed_end_date;
      }
    }
  }

  const requester = profiles.find((p) => p.id === request.requested_by);
  if (requester?.email) {
    await sendChangeRequestDecisionEmail({
      to: requester.email,
      recipientName: requester.full_name || "there",
      projectName: request.project_name,
      requestType: request.request_type,
      decision: input.decision,
      respondedByName: input.responderName,
      note: input.note ?? null,
    });
  }

  return { ok: true };
}

export function demoAddCrew(tradeId: string, name: string): DemoActionResult {
  crews.push({ id: uid("crew"), trade_id: tradeId, name, is_active: true, created_at: toDateKey(new Date()) });
  return { ok: true };
}

export function demoToggleCrewActive(crewId: string, isActive: boolean): DemoActionResult {
  const crew = crews.find((c) => c.id === crewId);
  if (!crew) return { ok: false, error: "Crew not found." };
  crew.is_active = isActive;
  return { ok: true };
}

export function demoAddExternalCommitment(input: {
  tradeId: string;
  startDate: string;
  endDate: string;
  crewCount: number;
  note?: string;
}): DemoActionResult {
  externalCommitments.push({
    id: uid("ext"),
    trade_id: input.tradeId,
    crew_count: input.crewCount,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note || null,
    created_at: toDateKey(new Date()),
    source: "manual",
    external_uid: null,
  });
  return { ok: true };
}

export function demoRemoveExternalCommitment(commitmentId: string): DemoActionResult {
  externalCommitments = externalCommitments.filter((e) => e.id !== commitmentId);
  return { ok: true };
}

export function demoAddExternalJob(input: {
  tradeId: string;
  title: string;
  startDate: string;
  endDate: string;
  crewMemberIds: string[];
}): DemoActionResult {
  const membersBelongToTrade = input.crewMemberIds.every((memberId) =>
    tradeCrewMembers.some((member) => member.id === memberId && member.trade_id === input.tradeId),
  );
  if (!membersBelongToTrade) {
    return { ok: false, error: "One or more crew members could not be found." };
  }

  const id = uid("ext");
  externalCommitments.push({
    id,
    trade_id: input.tradeId,
    crew_count: Math.max(1, input.crewMemberIds.length),
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.title,
    created_at: new Date().toISOString(),
    source: "manual",
    external_uid: null,
  });
  externalCommitmentCrewMembers.push(
    ...input.crewMemberIds.map((crewMemberId) => ({
      external_commitment_id: id,
      crew_member_id: crewMemberId,
      assigned_at: new Date().toISOString(),
    })),
  );
  return { ok: true };
}

export function demoRemoveExternalJob(commitmentId: string, tradeId: string): DemoActionResult {
  const commitment = externalCommitments.find(
    (item) => item.id === commitmentId && item.trade_id === tradeId,
  );
  if (!commitment) return { ok: false, error: "Job not found." };
  externalCommitments = externalCommitments.filter((item) => item.id !== commitmentId);
  externalCommitmentCrewMembers = externalCommitmentCrewMembers.filter(
    (assignment) => assignment.external_commitment_id !== commitmentId,
  );
  return { ok: true };
}

export function demoApplyCalendarSync(input: {
  tradeId: string;
  url: string;
  ranges: { uid: string; summary: string; startDate: string; endDate: string }[];
}): DemoActionResult {
  const trade = trades.find((t) => t.id === input.tradeId);
  if (!trade) return { ok: false, error: "Trade not found." };

  externalCommitments = externalCommitments.filter(
    (e) => !(e.trade_id === input.tradeId && e.source === "calendar_sync"),
  );
  externalCommitments.push(
    ...input.ranges.map((range) => ({
      id: uid("ext"),
      trade_id: input.tradeId,
      crew_count: 1,
      start_date: range.startDate,
      end_date: range.endDate,
      note: range.summary,
      created_at: new Date().toISOString(),
      source: "calendar_sync" as const,
      external_uid: range.uid,
    })),
  );

  trade.ics_feed_url = input.url;
  trade.ics_synced_at = new Date().toISOString();
  return { ok: true };
}

export function demoDisconnectCalendarSync(tradeId: string): DemoActionResult {
  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) return { ok: false, error: "Trade not found." };

  externalCommitments = externalCommitments.filter(
    (e) => !(e.trade_id === tradeId && e.source === "calendar_sync"),
  );
  trade.ics_feed_url = null;
  trade.ics_synced_at = null;
  return { ok: true };
}

export function demoAddCapacityOverride(input: {
  tradeId: string;
  startDate: string;
  endDate: string;
  totalCrews: number;
  note?: string;
}): DemoActionResult {
  const hasOverlap = capacityOverrides.some(
    (override) =>
      override.trade_id === input.tradeId &&
      overlapsRange(override.start_date, override.end_date, input.startDate, input.endDate),
  );
  if (hasOverlap) {
    return { ok: false, error: "This date range overlaps an existing capacity override." };
  }

  capacityOverrides.push({
    id: uid("capacity"),
    trade_id: input.tradeId,
    start_date: input.startDate,
    end_date: input.endDate,
    total_crews: input.totalCrews,
    note: input.note || null,
    created_at: new Date().toISOString(),
  });
  return { ok: true };
}

export function demoRemoveCapacityOverride(overrideId: string): DemoActionResult {
  capacityOverrides = capacityOverrides.filter((override) => override.id !== overrideId);
  return { ok: true };
}

export function demoAddTradeCrewMember(input: {
  tradeId: string;
  name: string;
  role: string;
}): DemoActionResult {
  tradeCrewMembers.push({
    id: uid("member"),
    trade_id: input.tradeId,
    name: input.name,
    role: input.role,
    is_active: true,
    created_at: new Date().toISOString(),
  });
  return { ok: true };
}

export function demoToggleTradeCrewMember(
  memberId: string,
  isActive: boolean,
  tradeId: string,
): DemoActionResult {
  const member = tradeCrewMembers.find(
    (candidate) => candidate.id === memberId && candidate.trade_id === tradeId,
  );
  if (!member) return { ok: false, error: "Crew member not found." };
  member.is_active = isActive;
  return { ok: true };
}

export function demoSetBookingCrewMembers(
  bookingId: string,
  memberIds: string[],
  tradeId: string,
): DemoActionResult {
  const booking = bookings.find(
    (candidate) => candidate.id === bookingId && candidate.trade_id === tradeId,
  );
  const membersBelongToTrade = memberIds.every((memberId) =>
    tradeCrewMembers.some((member) => member.id === memberId && member.trade_id === tradeId),
  );
  if (!booking || !membersBelongToTrade) {
    return { ok: false, error: "Booking or crew member not found." };
  }

  bookingCrewMembers = bookingCrewMembers.filter(
    (assignment) => assignment.booking_id !== bookingId,
  );
  bookingCrewMembers.push(
    ...memberIds.map((crewMemberId) => ({
      booking_id: bookingId,
      crew_member_id: crewMemberId,
      assigned_at: new Date().toISOString(),
    })),
  );
  return { ok: true };
}

export function demoCreateTrade(input: {
  companyName: string;
  phone?: string;
  email?: string;
  categoryIds: string[];
}): DemoActionResult {
  const id = uid("trade");
  trades.push({
    id,
    company_name: input.companyName,
    phone: input.phone || null,
    email: input.email || null,
    notes: null,
    is_active: true,
    created_at: toDateKey(new Date()),
    ics_feed_url: null,
    ics_synced_at: null,
  });
  for (const categoryId of input.categoryIds) {
    categoryLinks.push({ trade_id: id, category_id: categoryId });
  }
  return { ok: true };
}

export function demoCreateProject(input: {
  name: string;
  projectNumber: string;
  address?: string;
  mapLink?: string;
  pmId?: string;
  siteSupervisorId?: string;
  startDate?: string;
  endDate?: string;
}): DemoActionResult {
  projects.push({
    id: uid("project"),
    name: input.name,
    project_number: input.projectNumber,
    address: input.address || null,
    map_link: input.mapLink || null,
    pm_id: input.pmId || null,
    site_supervisor_id: input.siteSupervisorId || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    is_active: true,
    created_at: toDateKey(new Date()),
  });
  return { ok: true };
}
