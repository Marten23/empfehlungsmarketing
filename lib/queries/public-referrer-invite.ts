import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export type PublicReferrerInviteContext = {
  advisor_id: string;
  advisor_name: string;
  advisor_slug: string;
  referrer_invite_code: string | null;
};

export async function getPublicReferrerInviteContext(
  supabase: SupabaseClient,
  code: string,
) {
  const { data, error } = await supabase.rpc(
    "get_public_referrer_invite_context",
    {
      p_code: code,
    },
  );

  if (error) throw normalizeSupabaseError(error);
  const rows = (data ?? []) as PublicReferrerInviteContext[];
  return rows[0] ?? null;
}

export async function submitPublicReferrerApplicationRpc(
  supabase: SupabaseClient,
  input: {
    code: string;
    full_name: string;
    email: string;
    phone?: string | null;
  },
) {
  const { data, error } = await supabase.rpc("submit_public_referrer_application", {
    p_code: input.code,
    p_full_name: input.full_name,
    p_email: input.email,
    p_phone: input.phone ?? null,
  });

  if (error) throw normalizeSupabaseError(error);
  return data as string | null;
}
