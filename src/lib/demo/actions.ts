"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_ROLE_COOKIE, DEMO_ROLES } from "@/lib/demo/session";
import type { UserRole } from "@/lib/database.types";

export async function setDemoRole(role: UserRole): Promise<void> {
  if (!DEMO_ROLES.includes(role)) return;
  const store = await cookies();
  store.set(DEMO_ROLE_COOKIE, role, { path: "/" });
  revalidatePath("/");
}
