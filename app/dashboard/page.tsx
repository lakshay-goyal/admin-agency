import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth-server";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export const metadata: Metadata = { title: "Clients | Admin" };

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  return (
    <AdminWorkspace
      admin={{ name: admin.name, email: admin.email, username: admin.username }}
    />
  );
}
