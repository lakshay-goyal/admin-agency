import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { GalleryVerticalEndIcon } from "lucide-react";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getCurrentAdmin } from "@/lib/auth-server";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in | Admin" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const [admin, options, params] = await Promise.all([
    getCurrentAdmin(),
    fetchQuery(api.auth.getLoginOptions, {}),
    searchParams,
  ]);
  if (admin) redirect("/dashboard");

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" aria-hidden="true" />
            </div>
            Admin
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-xs">
            <LoginForm
              googleEnabled={options.googleEnabled}
              initialError={
                params.error
                  ? "Sign-in was unsuccessful. Try again with an approved admin account."
                  : undefined
              }
            />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground md:text-left">
          Your workspace. One secure place.
        </p>
      </div>
      <div className="relative hidden flex-col justify-end overflow-hidden bg-muted p-12 lg:flex">
        <div aria-hidden="true" className="absolute -right-32 -top-24 size-[36rem] rounded-full border border-foreground/10" />
        <div aria-hidden="true" className="absolute -right-16 -top-8 size-[28rem] rounded-full border border-foreground/10" />
        <div aria-hidden="true" className="absolute right-0 top-8 size-[20rem] rounded-full border border-foreground/10" />
        <div className="relative flex max-w-md flex-col gap-4">
          <GalleryVerticalEndIcon className="size-10" aria-hidden="true" />
          <h2 className="text-4xl font-medium tracking-tight text-balance">
            A clear view of everything you manage.
          </h2>
          <p className="text-base text-muted-foreground">
            Sign in and pick up where you left off.
          </p>
        </div>
      </div>
    </main>
  );
}
