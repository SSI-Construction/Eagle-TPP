"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/demo/config";
import { demoInviteStaff, demoUpdateProfileRole } from "@/lib/demo/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  role: z.enum(["pm", "site_supervisor"]),
});

const updateProfileRoleSchema = z
  .object({
    profileId: z.string().min(1),
    role: z.enum(["admin", "pm", "site_supervisor", "trade"]),
    tradeId: z.string().min(1).optional(),
  })
  .refine((data) => data.role !== "trade" || !!data.tradeId, {
    message: "Select a trade to link this account to.",
    path: ["tradeId"],
  });

type ActionResult = { ok: true } | { ok: false; error: string };

export async function inviteStaff(
  input: z.infer<typeof inviteStaffSchema>,
): Promise<ActionResult> {
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite" };
  }

  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") {
    return { ok: false, error: "Only admins can invite internal staff." };
  }

  if (isDemoMode()) {
    const result = demoInviteStaff(parsed.data);
    if (result.ok) revalidatePath("/team");
    return result;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Admin client not configured.",
    };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Failed to send invite." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      trade_id: null,
    })
    .eq("id", data.user.id);
  if (profileError) {
    return {
      ok: false,
      error: `Invite sent, but the role could not be assigned: ${profileError.message}`,
    };
  }

  revalidatePath("/team");
  revalidatePath("/projects");
  return { ok: true };
}

/** Admin-only: change an existing user's role, e.g. for accounts created outside the invite flow. */
export async function updateProfileRole(
  input: z.infer<typeof updateProfileRoleSchema>,
): Promise<ActionResult> {
  const parsed = updateProfileRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid role change" };
  }

  const currentProfile = await getCurrentProfile();
  if (currentProfile?.role !== "admin") {
    return { ok: false, error: "Only admins can change roles." };
  }
  if (currentProfile.id === parsed.data.profileId) {
    return { ok: false, error: "You can't change your own role." };
  }

  if (isDemoMode()) {
    const result = demoUpdateProfileRole(parsed.data);
    if (result.ok) revalidatePath("/team");
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      trade_id: parsed.data.role === "trade" ? parsed.data.tradeId : null,
    })
    .eq("id", parsed.data.profileId);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/team");
  revalidatePath("/projects");
  revalidatePath("/trades");
  return { ok: true };
}
