import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase after OAuth (Microsoft/Entra ID) or
// magic-link sign-in, exchanges the code for a session, then sends the user on.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/schedule";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
