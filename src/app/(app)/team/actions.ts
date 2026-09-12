"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/demo/config";
import { demoInviteStaff } from "@/lib/demo/store";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteStaffSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  role: z.enum(["pm", "site_supervisor"]),
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
