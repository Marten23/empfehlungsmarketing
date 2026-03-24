import type { SupabaseClient } from "@supabase/supabase-js";

export const ADVISOR_APP_ENABLED_STATUSES = new Set<string>([
  "setup_paid",
  "active_paid",
]);

export type AdvisorAccessStatus =
  | "registered"
  | "checkout_reserved"
  | "setup_pending"
  | "setup_paid"
  | "active_paid"
  | "canceled"
  | "delinquent"
  | "test_only";

export type AdvisorAccessState = {
  advisorId: string | null;
  accountStatus: AdvisorAccessStatus | null;
  canAccessApp: boolean;
  requiresActivation: boolean;
};

function normalizeAdvisorStatus(value: unknown): AdvisorAccessStatus {
  if (
    value === "registered" ||
    value === "checkout_reserved" ||
    value === "setup_pending" ||
    value === "setup_paid" ||
    value === "active_paid" ||
    value === "canceled" ||
    value === "delinquent" ||
    value === "test_only"
  ) {
    return value;
  }
  return "registered";
}

export function canAccessAdvisorApp(status: unknown): boolean {
  return ADVISOR_APP_ENABLED_STATUSES.has(normalizeAdvisorStatus(status));
}

export function requiresAdvisorActivation(status: unknown): boolean {
  return !canAccessAdvisorApp(status);
}

export async function getAdvisorAccessStateForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdvisorAccessState> {
  const ownerResult = await supabase
    .from("advisors")
    .select("id, account_status")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const owner = ownerResult.data as
    | { id: string; account_status?: string | null }
    | null;
  if (owner?.id) {
    const accountStatus = normalizeAdvisorStatus(owner.account_status ?? "registered");
    const canAccessApp = canAccessAdvisorApp(accountStatus);
    return {
      advisorId: owner.id,
      accountStatus,
      canAccessApp,
      requiresActivation: !canAccessApp,
    };
  }

  const membershipResult = await supabase
    .from("advisor_users")
    .select("advisor:advisors!inner(id, account_status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  const membershipRow = membershipResult.data?.[0] as
    | {
        advisor?: Array<{ id: string; account_status?: string | null }>;
      }
    | undefined;

  const advisor = membershipRow?.advisor?.[0];
  if (!advisor?.id) {
    return {
      advisorId: null,
      accountStatus: null,
      canAccessApp: false,
      requiresActivation: true,
    };
  }

  const accountStatus = normalizeAdvisorStatus(advisor.account_status ?? "registered");
  const canAccessApp = canAccessAdvisorApp(accountStatus);
  return {
    advisorId: advisor.id,
    accountStatus,
    canAccessApp,
    requiresActivation: !canAccessApp,
  };
}

export function getAdvisorPostLoginPath(canAccessAppFlag: boolean): string {
  return canAccessAppFlag ? "/berater/dashboard" : "/berater/aktivierung";
}
