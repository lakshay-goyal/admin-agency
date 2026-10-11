"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
  );

  return (
    <ConvexBetterAuthProvider
      client={convex}
      // The component's legacy generic infers session data as `never` with
      // Better Auth >=1.6.22. Keep the patched release and adapt only this prop.
      // https://github.com/get-convex/better-auth/issues/420
      authClient={authClient as unknown as ComponentProps<typeof ConvexBetterAuthProvider>["authClient"]}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
