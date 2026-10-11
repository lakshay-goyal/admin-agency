import "server-only";
import { cache } from "react";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { api } from "@/convex/_generated/api";

export const { handler, getToken, fetchAuthQuery } = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

// Validate the live session and admin access on the backend for every request.
export const getCurrentAdmin = cache(async () => {
  return fetchAuthQuery(api.auth.getCurrentUser, {});
});
