import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const invite = request.nextUrl.searchParams.get("invite") ?? "";
  const inviteType = request.nextUrl.searchParams.get("invite_type") ?? "advisor";

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Continue redirect even if signout fails; signup page can still handle flow.
  }

  const redirectUrl = new URL("/signup", request.url);
  if (invite) {
    redirectUrl.searchParams.set("invite", invite);
  }
  redirectUrl.searchParams.set("invite_type", inviteType);

  return NextResponse.redirect(redirectUrl);
}

