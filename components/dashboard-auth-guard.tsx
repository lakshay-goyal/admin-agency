"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";

export function DashboardAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const admin = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const denied = (!isLoading && !isAuthenticated) || admin === null;

  useEffect(() => {
    if (denied) {
      router.replace("/login");
      router.refresh();
    }
  }, [denied, router]);

  if (denied) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2" role="status">
        <Spinner /> Redirecting to sign in…
      </div>
    );
  }
  return children;
}
