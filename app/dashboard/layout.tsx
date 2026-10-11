import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth-server";
import { DashboardAuthGuard } from "@/components/dashboard-auth-guard";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!(await getCurrentAdmin())) redirect("/login");
  return <DashboardAuthGuard>{children}</DashboardAuthGuard>;
}
