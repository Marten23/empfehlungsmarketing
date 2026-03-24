import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/auth";
import {
  getAdvisorAccessStateForUser,
  getAdvisorPostLoginPath,
} from "@/lib/auth/advisor-access";

export async function requireAdvisorAppAccess() {
  const { user, role } = await getCurrentUser();
  if (!user) redirect("/berater/login");
  if (role === "referrer") redirect("/empfehler/dashboard");

  const supabase = await createClient();
  const access = await getAdvisorAccessStateForUser(supabase, user.id);
  if (!access.canAccessApp) {
    redirect(getAdvisorPostLoginPath(false));
  }
}

