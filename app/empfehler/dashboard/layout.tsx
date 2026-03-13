import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function ReferrerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getCurrentUser();

  if (!user) {
    redirect("/empfehler/login");
  }

  if (role === "advisor") {
    redirect("/berater/dashboard");
  }

  if (role !== "referrer") {
    redirect("/empfehler/login");
  }

  return <>{children}</>;
}
