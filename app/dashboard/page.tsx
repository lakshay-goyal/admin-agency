import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GalleryVerticalEndIcon, ShieldCheckIcon } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth-server";
import { SignOutButton } from "@/components/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard | Admin" };

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" aria-hidden="true" />
            </div>
            Admin
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:py-16">
        <div className="flex flex-col items-start gap-3">
          <Badge variant="secondary">Dashboard</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Welcome back, {admin.name}.
          </h1>
          <p className="text-muted-foreground">You&apos;re signed in to your admin workspace.</p>
        </div>
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5" aria-hidden="true" />
              Your account
            </CardTitle>
            <CardDescription>Your administrator account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{admin.email}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Access</dt>
                <dd>Administrator</dd>
              </div>
              {admin.username ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Username</dt>
                  <dd>{admin.username}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
