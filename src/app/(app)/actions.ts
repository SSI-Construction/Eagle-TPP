"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/config";

export async function signOut() {
  if (isDemoMode()) {
    // No real session to end in demo mode; just go back to the schedule.
    redirect("/schedule");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
