import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged operations (inviting auth
 * users). Never import this into client code — the service role key must
 * stay server-only.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — add it to .env.local to invite trades to log in.",
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
