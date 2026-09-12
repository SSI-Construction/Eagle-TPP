import { cookies } from "next/headers";
import type { UserRole } from "@/lib/database.types";

export const DEMO_ROLE_COOKIE = "demo_role";
export const DEMO_ROLES: UserRole[] = ["admin", "pm", "site_supervisor", "trade"];

/** Which role the person clicking around the demo is currently previewing as. */
export async function getDemoRole(): Promise<UserRole> {
  const store = await cookies();
  const value = store.get(DEMO_ROLE_COOKIE)?.value as UserRole | undefined;
  return value && DEMO_ROLES.includes(value) ? value : "pm";
}
