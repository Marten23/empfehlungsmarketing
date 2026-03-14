import DashboardReferralsPage from "@/app/dashboard/referrals/page";

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    sreason?: string;
    awarded?: string;
    reason?: string;
  }>;
};

export default async function AdvisorDashboardReferralsPage({
  searchParams,
}: PageProps) {
  return <DashboardReferralsPage searchParams={searchParams} />;
}
