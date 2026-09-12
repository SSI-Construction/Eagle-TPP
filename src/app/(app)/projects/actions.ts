"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { isDemoMode } from "@/lib/demo/config";
import { demoCreateProject } from "@/lib/demo/store";

type ActionResult = { ok: true } | { ok: false; error: string };

const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    projectNumber: z.string().trim().min(1, "Project number is required").max(100),
    address: z.string().trim().max(300).optional(),
    mapLink: z.string().trim().url("Enter a valid map link").max(1000).optional().or(z.literal("")),
    pmId: z.string().min(1).optional().or(z.literal("")),
    siteSupervisorId: z.string().min(1).optional().or(z.literal("")),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
  })
  .refine((value) => value.address || value.mapLink, {
    message: "Add an address or map link",
    path: ["address"],
  });

export async function createProject(
  input: z.infer<typeof createProjectSchema>,
): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid project" };
  }

  const profile = await getCurrentProfile();
  if (!profile || !["admin", "pm", "site_supervisor"].includes(profile.role)) {
    return { ok: false, error: "You do not have permission to create projects." };
  }

  if (isDemoMode()) {
    const result = demoCreateProject({
      name: parsed.data.name,
      projectNumber: parsed.data.projectNumber,
      address: parsed.data.address,
      mapLink: parsed.data.mapLink,
      pmId: parsed.data.pmId,
      siteSupervisorId: parsed.data.siteSupervisorId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });
    if (result.ok) {
      revalidatePath("/projects");
      revalidatePath("/schedule");
    }
    return result;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    name: parsed.data.name,
    project_number: parsed.data.projectNumber,
    address: parsed.data.address || null,
    map_link: parsed.data.mapLink || null,
    pm_id: parsed.data.pmId || null,
    site_supervisor_id: parsed.data.siteSupervisorId || null,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath("/schedule");
  return { ok: true };
}
