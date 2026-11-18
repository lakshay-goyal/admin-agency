"use client";

import { useRef, useState, type ComponentProps, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm({
  className,
  googleEnabled,
  initialError,
  ...props
}: ComponentProps<"form"> & {
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [pending, setPending] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState(initialError ?? "");
  const errorRef = useRef<HTMLDivElement>(null);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setError("");
    setPending("password");

    try {
      const result = identifier.includes("@")
        ? await authClient.signIn.email({ email: identifier, password })
        : await authClient.signIn.username({ username: identifier, password });

      if (result.error) {
        showError(
          result.error.status === 429
            ? "Too many attempts. Please wait a moment and try again."
            : "Unable to sign in. Check your credentials and admin access.",
        );
        return;
      }
      // Recreate the auth provider with the newly issued session, including account switches.
      window.location.replace("/dashboard");
    } catch {
      showError("Unable to connect. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleGoogleSignIn() {
    if (pending || !googleEnabled) return;
    setError("");
    setPending("google");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        errorCallbackURL: "/login?error=google",
      });
      if (result.error) {
        showError("Google sign-in failed. Please try again.");
        setPending(null);
      }
    } catch {
      showError("Unable to connect to Google. Please try again.");
      setPending(null);
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
      aria-busy={pending !== null}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Sign in to your admin dashboard
          </p>
        </div>
        {error ? (
          <Alert variant="destructive" ref={errorRef} tabIndex={-1} role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-disabled={pending !== null}>
          <FieldLabel htmlFor="identifier">Email or username</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@company.com"
            className="h-11"
            required
            disabled={pending !== null}
          />
        </Field>
        <Field data-disabled={pending !== null}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-11"
            required
            disabled={pending !== null}
          />
        </Field>
        <Field>
          <Button type="submit" className="h-11" disabled={pending !== null}>
            {pending === "password" ? <Spinner data-icon="inline-start" /> : null}
            {pending === "password" ? "Signing in…" : "Sign in"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            className="h-11"
            disabled={pending !== null || !googleEnabled}
            onClick={handleGoogleSignIn}
            aria-describedby={!googleEnabled ? "google-help" : undefined}
          >
            {pending === "google" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37ZM12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22ZM6.4 13.93a6 6 0 0 1 0-3.86v-2.6H3.06a10 10 0 0 0 0 9.06l3.34-2.6ZM12 5.95c1.47 0 2.79.5 3.82 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.47l3.34 2.6C7.2 7.71 9.4 5.95 12 5.95Z" />
              </svg>
            )}
            {pending === "google" ? "Connecting…" : "Continue with Google"}
          </Button>
          {!googleEnabled ? (
            <FieldDescription id="google-help" className="text-center">
              Google sign-in is not available yet.
            </FieldDescription>
          ) : null}
          <FieldDescription className="text-center">
            Access is limited to approved administrators.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
