import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureAdvisorOnboardingForUser } from "@/lib/auth/onboarding";
import { getAdvisorAccessStateForUser } from "@/lib/auth/advisor-access";

export default async function AdvisorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getCurrentUser();

  if (!user) {
    redirect("/berater/login");
  }

  if (role === "referrer") {
    redirect("/empfehler/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (authUser) {
    await ensureAdvisorOnboardingForUser(supabase, authUser);
    const access = await getAdvisorAccessStateForUser(supabase, authUser.id);
    if (!access.canAccessApp) {
      redirect("/berater/aktivierung");
    }
  }

  return <>{children}</>;
}
