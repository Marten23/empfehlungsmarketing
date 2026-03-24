import DashboardReferralsPage from "@/app/dashboard/referrals/page";
import { requireAdvisorAppAccess } from "@/lib/auth/require-advisor-app-access";

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    sreason?: string;
    awarded?: string;
    reason?: string;
  }>;
};

export default async function AdvisorReferralsPage({ searchParams }: PageProps) {
  await requireAdvisorAppAccess();
  return <DashboardReferralsPage searchParams={searchParams} />;
}
