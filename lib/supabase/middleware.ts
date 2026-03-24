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
    pathname === "/berater/signup" ||
    pathname === "/empfehler/login";

  const isAdvisorActivationRoute = pathname.startsWith("/berater/aktivierung");
  const isAdvisorProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/berater/dashboard") ||
    (pathname.startsWith("/berater/") &&
      pathname !== "/berater/login" &&
      pathname !== "/berater/signup" &&
      !isAdvisorActivationRoute);
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
      if (role === "referrer") {
        dashboardUrl.pathname = "/empfehler/dashboard";
        return NextResponse.redirect(dashboardUrl);
      }

      const { data: advisorRow } = await supabase
        .from("advisors")
        .select("id, account_status")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const status =
        (advisorRow as { account_status?: string | null } | null)
          ?.account_status ?? "registered";

      dashboardUrl.pathname =
        status === "setup_paid" || status === "active_paid"
          ? "/berater/dashboard"
          : "/berater/aktivierung";
      return NextResponse.redirect(dashboardUrl);
    } catch {
      // Soft-fail in middleware, page-level guards still handle redirect.
    }
  }

  if (!authFetchFailed && user && (isAdvisorProtectedRoute || isAdvisorActivationRoute)) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = (profile as { role?: string } | null)?.role ?? null;
      if (role === "referrer") {
        const target = request.nextUrl.clone();
        target.pathname = "/empfehler/dashboard";
        return NextResponse.redirect(target);
      }

      const { data: advisorRow } = await supabase
        .from("advisors")
        .select("id, account_status")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const status =
        (advisorRow as { account_status?: string | null } | null)
          ?.account_status ?? "registered";
      const canAccessAdvisorApp = status === "setup_paid" || status === "active_paid";

      if (!canAccessAdvisorApp && isAdvisorProtectedRoute) {
        const target = request.nextUrl.clone();
        target.pathname = "/berater/aktivierung";
        return NextResponse.redirect(target);
      }

      if (canAccessAdvisorApp && isAdvisorActivationRoute) {
        const target = request.nextUrl.clone();
        target.pathname = "/berater/dashboard";
        return NextResponse.redirect(target);
      }
    } catch {
      // Soft-fail in middleware; layouts/pages enforce redirect too.
    }
  }

  return response;
}
