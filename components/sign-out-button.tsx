"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Unable to sign out. Please try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={signOut}
        disabled={pending}
        aria-label="Sign out"
        title="Sign out"
      >
        {pending ? <Spinner /> : <LogOutIcon aria-hidden="true" />}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" className="min-h-11" onClick={signOut} disabled={pending}>
        {pending ? <Spinner /> : <LogOutIcon aria-hidden="true" />}
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
