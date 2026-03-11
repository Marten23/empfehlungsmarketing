import { createClient } from "@/lib/supabase/server";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export type AdvisorContext = {
  advisorId: string;
  advisorName: string;
  advisorSlug: string;
  membership: "owner" | "member";
};

export async function getCurrentAdvisorContext(): Promise<AdvisorContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: ownerAdvisor, error: ownerError } = await supabase
    .from("advisors")
    .select("id, name, slug, is_active")
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerError) throw normalizeSupabaseError(ownerError);

  if (ownerAdvisor) {
    return {
      advisorId: ownerAdvisor.id as string,
      advisorName: ownerAdvisor.name as string,
      advisorSlug: ownerAdvisor.slug as string,
      membership: "owner",
    };
  }

  const { data: advisorMembershipRows, error: membershipError } = await supabase
    .from("advisor_users")
    .select(
      "advisor:advisors!inner(id, name, slug, is_active), role, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError) throw normalizeSupabaseError(membershipError);

  const membershipRow = advisorMembershipRows?.[0] as
    | {
        advisor: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
        }[];
      }
    | undefined;

  const advisor = membershipRow?.advisor?.[0];
  if (!advisor || !advisor.is_active) return null;

  return {
    advisorId: advisor.id,
    advisorName: advisor.name,
    advisorSlug: advisor.slug,
    membership: "member",
  };
}
