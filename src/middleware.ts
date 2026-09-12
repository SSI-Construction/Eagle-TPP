import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isDemoMode } from "@/lib/demo/config";

export async function middleware(request: NextRequest) {
  // Demo mode has no real Supabase project configured, so skip auth entirely.
  if (isDemoMode()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
