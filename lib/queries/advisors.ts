import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export async function getAdvisorActivationState(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data, error } = await supabase
    .from("advisors")
    .select("id, is_active, account_activated_at")
    .eq("id", advisorId)
    .maybeSingle();

  if (error) {
    const code = (error as { code?: string }).code;
    // Fallback for DBs where account_activated_at is not migrated yet.
    if (code === "PGRST204") {
      const legacy = await supabase
        .from("advisors")
        .select("id, is_active")
        .eq("id", advisorId)
        .maybeSingle();
      if (legacy.error) throw normalizeSupabaseError(legacy.error);
      return {
        id: (legacy.data as { id: string } | null)?.id ?? advisorId,
        is_active: (legacy.data as { is_active?: boolean } | null)?.is_active ?? false,
        account_activated_at: null,
      };
    }
    throw normalizeSupabaseError(error);
  }

  const row = data as
    | {
        id: string;
        is_active: boolean;
        account_activated_at: string | null;
      }
    | null;

  return (
    row ?? {
      id: advisorId,
      is_active: false,
      account_activated_at: null,
    }
  );
}

export async function markAdvisorContractActivated(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const rpc = await supabase.rpc("set_advisor_account_status", {
    p_advisor_id: advisorId,
    p_new_status: "active_paid",
    p_billing_interval: "monthly",
    p_period_start: new Date().toISOString(),
    p_period_end: null,
    p_mode: "live",
  });

  if (!rpc.error) return;

  const nowIso = new Date().toISOString();
  const primary = await supabase
    .from("advisors")
    .update({
      is_active: true,
      account_activated_at: nowIso,
      account_status: "active_paid",
      setup_paid_at: nowIso,
      active_paid_at: nowIso,
      billing_mode: "live",
      account_classification: "live",
      billing_interval_current: "monthly",
    })
    .eq("id", advisorId);

  if (!primary.error) return;

  const primaryCode = String((primary.error as { code?: unknown }).code ?? "");
  const primaryMessage = String(
    (primary.error as { message?: unknown }).message ?? "",
  ).toLowerCase();
  const shouldFallbackToLegacyUpdate =
    primaryCode === "PGRST204" ||
    primaryCode === "42703" ||
    primaryMessage.includes("account_activated_at") ||
    primaryMessage.includes("account_status");

  if (shouldFallbackToLegacyUpdate) {
    // Fallback when account_activated_at column is not available yet.
    const fallback = await supabase
      .from("advisors")
      .update({ is_active: true })
      .eq("id", advisorId);
    if (fallback.error) throw normalizeSupabaseError(fallback.error);
    return;
  }

  throw normalizeSupabaseError(primary.error);
}
