"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/demo/config";
import {
  demoAddCrew,
  demoAddExternalCommitment,
  demoCreateTrade,
  demoRemoveExternalCommitment,
  demoToggleCrewActive,
} from "@/lib/demo/store";

type ActionResult = { ok: true } | { ok: false; error: string };

const createTradeSchema = z.object({
  companyName: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  categoryIds: z.array(z.string().min(1)).default([]),
});

export async function createTrade(
  input: z.infer<typeof createTradeSchema>,
): Promise<ActionResult> {
  const parsed = createTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid trade" };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Only admins can add trades." };
  }

  if (isDemoMode()) {
    const result = demoCreateTrade({
      companyName: parsed.data.companyName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      categoryIds: parsed.data.categoryIds,
    });
    if (result.ok) {
      revalidatePath("/trades");
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      company_name: parsed.data.companyName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    })
    .select("id")
    .single();

  if (error || !trade) {
    return { ok: false, error: error?.message ?? "Failed to create trade" };
  }

  if (parsed.data.categoryIds.length > 0) {
    const { error: linkError } = await supabase.from("trade_category_links").insert(
      parsed.data.categoryIds.map((categoryId) => ({
        trade_id: trade.id,
        category_id: categoryId,
      })),
    );
    if (linkError) return { ok: false, error: linkError.message };
  }

  revalidatePath("/trades");
  revalidatePath("/schedule");
  return { ok: true };
}

const addCrewSchema = z.object({
  tradeId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export async function addCrew(input: z.infer<typeof addCrewSchema>): Promise<ActionResult> {
  const parsed = addCrewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid crew" };
  }

  if (isDemoMode()) {
    const result = demoAddCrew(parsed.data.tradeId, parsed.data.name);
    if (result.ok) {
      revalidatePath(`/trades/${parsed.data.tradeId}`);
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crews").insert({
    trade_id: parsed.data.tradeId,
    name: parsed.data.name,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/trades/${parsed.data.tradeId}`);
  revalidatePath("/schedule");
  return { ok: true };
}

export async function toggleCrewActive(crewId: string, isActive: boolean): Promise<ActionResult> {
  if (isDemoMode()) {
    const result = demoToggleCrewActive(crewId, isActive);
    if (result.ok) {
      revalidatePath("/trades");
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crews")
    .update({ is_active: isActive })
    .eq("id", crewId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trades");
  revalidatePath("/schedule");
  return { ok: true };
}

const externalCommitmentSchema = z
  .object({
    tradeId: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    crewCount: z.coerce.number().int().min(1).max(50),
    note: z.string().max(500).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export async function addExternalCommitment(
  input: z.infer<typeof externalCommitmentSchema>,
): Promise<ActionResult> {
  const parsed = externalCommitmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry" };
  }

  if (isDemoMode()) {
    const result = demoAddExternalCommitment({
      tradeId: parsed.data.tradeId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      crewCount: parsed.data.crewCount,
      note: parsed.data.note,
    });
    if (result.ok) {
      revalidatePath(`/trades/${parsed.data.tradeId}`);
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trade_external_commitments").insert({
    trade_id: parsed.data.tradeId,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    crew_count: parsed.data.crewCount,
    note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/trades/${parsed.data.tradeId}`);
  revalidatePath("/schedule");
  return { ok: true };
}

export async function removeExternalCommitment(
  commitmentId: string,
  tradeId: string,
): Promise<ActionResult> {
  if (isDemoMode()) {
    const result = demoRemoveExternalCommitment(commitmentId);
    if (result.ok) {
      revalidatePath(`/trades/${tradeId}`);
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trade_external_commitments")
    .delete()
    .eq("id", commitmentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/schedule");
  return { ok: true };
}

const inviteTradeLoginSchema = z.object({
  tradeId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
});

/** Creates (or invites) a login for someone at a trade, and links their profile to that trade. */
export async function inviteTradeLogin(
  input: z.infer<typeof inviteTradeLoginSchema>,
): Promise<ActionResult> {
  const parsed = inviteTradeLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite" };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Only admins can invite trades to log in." };
  }

  if (isDemoMode()) {
    console.log(
      `[demo] Would invite ${parsed.data.email} (${parsed.data.fullName}) to log in for trade ${parsed.data.tradeId}.`,
    );
    return { ok: true };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Admin client not configured." };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Failed to send invite." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "trade", trade_id: parsed.data.tradeId, full_name: parsed.data.fullName })
    .eq("id", data.user.id);
  if (profileError) {
    return {
      ok: false,
      error: `Invite email sent, but failed to link the account to this trade: ${profileError.message}`,
    };
  }

  revalidatePath(`/trades/${parsed.data.tradeId}`);
  return { ok: true };
}

