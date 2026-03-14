import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return { url, publishableKey };
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: { id: string } | null = null;
  let authFetchFailed = false;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser ? { id: authUser.id } : null;
  } catch {
    authFetchFailed = true;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/berater/login" ||
    pathname === "/empfehler/login";

  const isAdvisorProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/berater/dashboard");
  const isReferrerProtectedRoute =
    pathname.startsWith("/referrer") || pathname.startsWith("/empfehler/dashboard");
  const isProtectedRoute = isAdvisorProtectedRoute || isReferrerProtectedRoute;

  if (!authFetchFailed && !user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = isReferrerProtectedRoute
      ? "/empfehler/login"
      : "/berater/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!authFetchFailed && user && isAuthPage) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = (profile as { role?: string } | null)?.role ?? null;
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname =
        role === "referrer" ? "/empfehler/dashboard" : "/berater/dashboard";
      return NextResponse.redirect(dashboardUrl);
    } catch {
      // Bei temporären Netzwerkproblemen nicht abstürzen,
      // sondern Seite normal ausliefern.
    }
  }

  return response;
}
