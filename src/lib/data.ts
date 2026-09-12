import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { isDemoMode } from "@/lib/demo/config";
import { getDemoRole } from "@/lib/demo/session";
import {
  demoGetAllProfiles,
  demoGetBookingsForTrade,
  demoGetBookingsInRange,
  demoGetExternalCommitmentsForTrade,
  demoGetExternalCommitmentsInRange,
  demoGetProjects,
  demoGetTradeCategories,
  demoGetTradesWithDetails,
  demoGetTradeWithDetailsById,
  getProfileForRole,
} from "@/lib/demo/store";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Trade = Database["public"]["Tables"]["trades"]["Row"];
export type TradeCategory = Database["public"]["Tables"]["trade_categories"]["Row"];
export type Crew = Database["public"]["Tables"]["crews"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type ExternalCommitment =
  Database["public"]["Tables"]["trade_external_commitments"]["Row"];

/** Returns the signed-in user's profile, or null if not signed in / no profile row yet. */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoMode()) {
    return getProfileForRole(await getDemoRole());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export async function getTradeCategories(): Promise<TradeCategory[]> {
  if (isDemoMode()) return demoGetTradeCategories();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export interface TradeWithDetails extends Trade {
  categoryIds: string[];
  crews: Crew[];
}

export async function getTradesWithDetails(): Promise<TradeWithDetails[]> {
  if (isDemoMode()) return demoGetTradesWithDetails();

  const supabase = await createClient();
  const [{ data: trades, error: tErr }, { data: links, error: lErr }, { data: crews, error: cErr }] =
    await Promise.all([
      supabase.from("trades").select("*").order("company_name"),
      supabase.from("trade_category_links").select("*"),
      supabase.from("crews").select("*").order("name"),
    ]);
  if (tErr) throw tErr;
  if (lErr) throw lErr;
  if (cErr) throw cErr;

  return (trades ?? []).map((trade) => ({
    ...trade,
    categoryIds: (links ?? []).filter((l) => l.trade_id === trade.id).map((l) => l.category_id),
    crews: (crews ?? []).filter((c) => c.trade_id === trade.id),
  }));
}

export async function getProjects(): Promise<Project[]> {
  if (isDemoMode()) return demoGetProjects();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getBookingsInRange(
  startDate: string,
  endDate: string,
): Promise<Booking[]> {
  if (isDemoMode()) return demoGetBookingsInRange(startDate, endDate);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  if (error) throw error;
  return data ?? [];
}

export async function getExternalCommitmentsInRange(
  startDate: string,
  endDate: string,
): Promise<ExternalCommitment[]> {
  if (isDemoMode()) return demoGetExternalCommitmentsInRange(startDate, endDate);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_external_commitments")
    .select("*")
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  if (error) throw error;
  return data ?? [];
}

/** All non-cancelled bookings for a trade (past and future), soonest first. */
export async function getBookingsForTrade(tradeId: string): Promise<Booking[]> {
  if (isDemoMode()) return demoGetBookingsForTrade(tradeId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("trade_id", tradeId)
    .neq("status", "cancelled")
    .order("start_date");
  if (error) throw error;
  return data ?? [];
}


export async function getAllProfiles(): Promise<Profile[]> {
  if (isDemoMode()) return demoGetAllProfiles();

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function getTradeWithDetailsById(
  tradeId: string,
): Promise<TradeWithDetails | null> {
  if (isDemoMode()) return demoGetTradeWithDetailsById(tradeId);

  const trades = await getTradesWithDetails();
  return trades.find((t) => t.id === tradeId) ?? null;
}

export async function getExternalCommitmentsForTrade(
  tradeId: string,
): Promise<ExternalCommitment[]> {
  if (isDemoMode()) return demoGetExternalCommitmentsForTrade(tradeId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_external_commitments")
    .select("*")
    .eq("trade_id", tradeId)
    .order("start_date");
  if (error) throw error;
  return data ?? [];
}

