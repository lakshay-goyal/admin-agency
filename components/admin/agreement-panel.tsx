"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import type { ClientDetail } from "@/lib/admin/types";
import {
  arrayToLines,
  errorMessage,
  formatDateTime,
  formatMoney,
  linesToArray,
  relativeTime,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToastManager } from "@/components/ui/toast";

type Engagement = NonNullable<ClientDetail["engagement"]>;
type Dependency = Engagement["dependencies"][number];

type FormState = {
  summary: string;
  scope: string;
  plan: string;
  currency: string;
  setupFee: string;
  recurringFee: string;
  exclusions: string;
  thirdPartyCosts: string;
  legalName: string;
  billingEmail: string;
  signedAgreementRef: string;
  advancePaymentRef: string;
  identityVerificationRef: string;
  verifiedEmails: string;
  dependencies: Dependency[];
};

export function AgreementPanel({ client }: { client: ClientDetail }) {
  const updateEngagement = useMutation(api.clients.updateEngagement);
  const toast = useToastManager();
  const engagement = client.engagement;
  const [form, setForm] = useState<FormState>(() => initialForm(engagement));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateEngagement({
        authUserId: client.authUserId,
        summary: form.summary,
        scope: linesToArray(form.scope),
        plan: form.plan,
        currency: form.currency,
        setupFee: Number(form.setupFee || 0),
        recurringFee: form.recurringFee ? Number(form.recurringFee) : null,
        exclusions: linesToArray(form.exclusions),
        thirdPartyCosts: form.thirdPartyCosts,
        legalName: form.legalName,
        billingEmail: form.billingEmail,
        signedAgreementRef: form.signedAgreementRef,
        advancePaymentRef: form.advancePaymentRef,
        identityVerificationRef: form.identityVerificationRef,
        verifiedEmails: linesToArray(form.verifiedEmails),
        dependencies: form.dependencies
          .map((item) => ({
            label: item.label.trim(),
            owner: item.owner.trim(),
            verified: item.verified,
          }))
          .filter((item) => item.label),
      });
      toast.add({
        title: "Agreement updated",
        description: "The client's agreement and billing record is now live.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not save the agreement",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Agreement & billing</CardTitle>
          <CardDescription>
            This is the commercial record shown in the client&apos;s workspace.
            It is not a payment system.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={save} disabled={saving}>
              <SaveIcon data-icon="inline-start" />
              {saving ? "Saving…" : "Save agreement"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {engagement ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {formatMoney(engagement.currency, engagement.setupFee)} setup
              </Badge>
              {engagement.recurringFee ? (
                <Badge variant="outline">
                  {formatMoney(engagement.currency, engagement.recurringFee)} / mo
                </Badge>
              ) : null}
              <span>Updated {relativeTime(engagement.updatedAt)}</span>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No engagement record exists yet. Complete the fields and save to
              create one.
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Plan and fees</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan" hint="For example Basic, Pro, or a custom plan.">
                <Input
                  value={form.plan}
                  onChange={(event) => set("plan", event.target.value)}
                  list="plan-options"
                />
                <datalist id="plan-options">
                  <option value="Basic" />
                  <option value="Pro" />
                </datalist>
              </Field>
              <Field label="Currency" hint="Three-letter code, e.g. INR, USD, GBP.">
                <Input
                  value={form.currency}
                  maxLength={3}
                  onChange={(event) =>
                    set("currency", event.target.value.toUpperCase())
                  }
                />
              </Field>
              <Field label="Setup fee">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.setupFee}
                  onChange={(event) => set("setupFee", event.target.value)}
                />
              </Field>
              <Field label="Recurring fee" hint="Leave empty when there is no recurring fee.">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.recurringFee}
                  onChange={(event) => set("recurringFee", event.target.value)}
                />
              </Field>
              <Field label="Third-party costs" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={form.thirdPartyCosts}
                  onChange={(event) => set("thirdPartyCosts", event.target.value)}
                  placeholder="Domains, tools, advertising, and other costs billed separately."
                />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Approved scope</h3>
            <Field label="Agreed summary">
              <Textarea
                rows={3}
                value={form.summary}
                onChange={(event) => set("summary", event.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Scope items" hint="One item per line.">
                <Textarea
                  rows={5}
                  value={form.scope}
                  onChange={(event) => set("scope", event.target.value)}
                />
              </Field>
              <Field label="Exclusions" hint="One item per line.">
                <Textarea
                  rows={5}
                  value={form.exclusions}
                  onChange={(event) => set("exclusions", event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Billing and verification</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Legal name">
                <Input
                  value={form.legalName}
                  onChange={(event) => set("legalName", event.target.value)}
                />
              </Field>
              <Field label="Billing email">
                <Input
                  type="email"
                  value={form.billingEmail}
                  onChange={(event) => set("billingEmail", event.target.value)}
                />
              </Field>
              <Field label="Signed agreement reference">
                <Input
                  value={form.signedAgreementRef}
                  onChange={(event) =>
                    set("signedAgreementRef", event.target.value)
                  }
                  placeholder="AG-2026-014"
                />
              </Field>
              <Field label="Advance payment reference">
                <Input
                  value={form.advancePaymentRef}
                  onChange={(event) =>
                    set("advancePaymentRef", event.target.value)
                  }
                  placeholder="ADV-2026-014"
                />
              </Field>
              <Field label="Identity verification reference">
                <Input
                  value={form.identityVerificationRef}
                  onChange={(event) =>
                    set("identityVerificationRef", event.target.value)
                  }
                />
              </Field>
              <Field
                label="Verified emails"
                hint="One email per line. These confirm workspace contacts."
              >
                <Textarea
                  rows={3}
                  value={form.verifiedEmails}
                  onChange={(event) =>
                    set("verifiedEmails", event.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Dependencies</h3>
                <p className="text-sm text-muted-foreground">
                  Items the client or a third party must complete.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  set("dependencies", [
                    ...form.dependencies,
                    { label: "", owner: "", verified: false },
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </div>
            {form.dependencies.length ? (
              <div className="flex flex-col gap-2">
                {form.dependencies.map((dependency, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <Input
                      value={dependency.label}
                      placeholder="Dependency"
                      onChange={(event) => {
                        const next = [...form.dependencies];
                        next[index] = { ...next[index], label: event.target.value };
                        set("dependencies", next);
                      }}
                    />
                    <Input
                      value={dependency.owner}
                      placeholder="Owner"
                      onChange={(event) => {
                        const next = [...form.dependencies];
                        next[index] = { ...next[index], owner: event.target.value };
                        set("dependencies", next);
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={dependency.verified}
                        onCheckedChange={(checked) => {
                          const next = [...form.dependencies];
                          next[index] = { ...next[index], verified: checked };
                          set("dependencies", next);
                        }}
                      />
                      Verified
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove dependency"
                      onClick={() =>
                        set(
                          "dependencies",
                          form.dependencies.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No dependencies recorded.
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
            <span>
              Last saved{" "}
              {engagement ? formatDateTime(engagement.updatedAt) : "not yet"}
            </span>
            <Button size="sm" onClick={save} disabled={saving}>
              <SaveIcon data-icon="inline-start" />
              {saving ? "Saving…" : "Save agreement"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function initialForm(engagement: Engagement | null): FormState {
  return {
    summary: engagement?.summary ?? "",
    scope: arrayToLines(engagement?.scope),
    plan: engagement?.plan ?? "",
    currency: engagement?.currency ?? "",
    setupFee: engagement ? String(engagement.setupFee) : "",
    recurringFee:
      engagement?.recurringFee !== null && engagement?.recurringFee !== undefined
        ? String(engagement.recurringFee)
        : "",
    exclusions: arrayToLines(engagement?.exclusions),
    thirdPartyCosts: engagement?.thirdPartyCosts ?? "",
    legalName: engagement?.legalName ?? "",
    billingEmail: engagement?.billingEmail ?? "",
    signedAgreementRef: engagement?.signedAgreementRef ?? "",
    advancePaymentRef: engagement?.advancePaymentRef ?? "",
    identityVerificationRef: engagement?.identityVerificationRef ?? "",
    verifiedEmails: arrayToLines(engagement?.verifiedEmails),
    dependencies: engagement?.dependencies ?? [],
  };
}
