"use client";

import { useState } from "react";
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDashedIcon,
  FileTextIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
} from "lucide-react";
import type { ClientDetail, ClientTab } from "@/lib/admin/types";
import {
  formatDateTime,
  formatMoney,
  relativeTime,
} from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MetaItem, MiniProgress } from "@/components/admin/admin-ui";
import {
  BriefStatusBadge,
  DocumentStatusBadge,
  PlanBadge,
  ProjectStatusBadge,
  StageStatusBadge,
} from "@/components/admin/status-badges";
import { titleCase } from "@/lib/admin/format";

export function OverviewPanel({
  client,
  onNavigate,
  onEditProject,
}: {
  client: ClientDetail;
  onNavigate: (tab: ClientTab) => void;
  onEditProject: () => void;
}) {
  const [checksOpen, setChecksOpen] = useState(false);
  const answers = client.draft?.answers ?? {};
  const openChecks = client.checks.filter((check) => check.status !== "complete");
  const role = answerText(answers, "P02.1");
  const location = answerRecord(answers, "P02.2");
  const comms = Array.isArray(answers["P02.3"]?.value)
    ? answers["P02.3"].value.join(", ")
    : "";
  const industry = Array.isArray(answers["P03.2"]?.value)
    ? answers["P03.2"].value.join(", ")
    : answerText(answers, "P03.2");
  const businessStage = answerText(answers, "P03.3");
  const phone = answerText(answers, "P01.4");
  const nextActivity = client.activity.slice(0, 4);
  const latestFile = client.documents[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {openChecks.length ? (
                <CircleAlertIcon className="size-4 text-amber-500" />
              ) : (
                <CheckCircle2Icon className="size-4 text-emerald-600" />
              )}
              Needs your attention
            </CardTitle>
            <CardDescription>
              {openChecks.length
                ? `${openChecks.length} item${openChecks.length === 1 ? "" : "s"} still need data or a decision.`
                : "Every tracked data point is complete for this client."}
            </CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <Badge variant={openChecks.length ? "destructive" : "secondary"}>
                  {client.completeness.complete}/{client.completeness.total} complete
                </Badge>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setChecksOpen(true)}
                >
                  Checklist
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {openChecks.length ? (
              openChecks.slice(0, 7).map((check) => (
                <button
                  key={check.id}
                  type="button"
                  onClick={() => onNavigate(check.tab)}
                  className="group flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60"
                >
                  {check.status === "missing" ? (
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{check.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {check.detail}
                    </span>
                  </span>
                  <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))
            ) : (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                No missing fields, open follow-ups, or unverified prerequisites.
                Keep the project progress and next step up to date.
              </p>
            )}
            {openChecks.length > 7 ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setChecksOpen(true)}
              >
                Review all {client.checks.length} checks
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project snapshot</CardTitle>
            <CardDescription>
              The delivery state your client sees in their workspace.
            </CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" onClick={onEditProject}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={client.project?.status ?? null} />
              <BriefStatusBadge status={client.draft?.status ?? null} />
              <PlanBadge plan={client.engagement?.plan ?? null} />
              {client.project?.currentStage ? (
                <Badge variant="outline">{client.project.currentStage}</Badge>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Overall progress
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {client.deliveryAverage}%
                </span>
              </div>
              <MiniProgress value={client.deliveryAverage} />
            </div>
            {client.project ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <SparklesIcon className="size-4" />
                  Next step
                </div>
                <p className="mt-1 text-sm font-medium">
                  {client.project.nextStepTitle || "No next step set"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {client.project.nextStepDetail || "Add a clear next step for the client."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No project summary exists yet. Create one to start showing
                delivery progress to the client.
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-3.5" />
                {client.project?.startDate || "No start date"} →{" "}
                {client.project?.targetDate || "No target date"}
              </span>
              <span>Updated {relativeTime(client.project?.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery stages</CardTitle>
            <CardDescription>
              {client.stages.length
                ? `${client.stages.filter((stage) => stage.status === "complete").length} of ${client.stages.length} stages complete.`
                : "No stages have been created for this client."}
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate("delivery")}
              >
                Manage
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {client.stages.length ? (
              client.stages.map((stage) => (
                <div key={stage.stageId} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{stage.title}</span>
                    <div className="flex items-center gap-2">
                      {!stage.visible ? (
                        <Badge variant="ghost">Hidden</Badge>
                      ) : null}
                      <StageStatusBadge status={stage.status} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {stage.progress}%
                      </span>
                    </div>
                  </div>
                  <MiniProgress value={stage.progress} />
                </div>
              ))
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => onNavigate("delivery")}
              >
                Set up delivery stages
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Client context</CardTitle>
            <CardDescription>Answers from the project brief.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <MetaItem
                label="Contact"
                value={
                  <span className="flex flex-col gap-0.5">
                    <span>{client.summary.contactName || client.user?.name || "—"}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MailIcon className="size-3" />
                      {client.summary.contactEmail || client.user?.email || "—"}
                      {client.user?.emailVerified ? (
                        <Badge variant="secondary">Verified</Badge>
                      ) : null}
                    </span>
                  </span>
                }
              />
              {phone ? (
                <MetaItem
                  label="Phone"
                  value={
                    <span className="flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5 text-muted-foreground" />
                      {phone}
                    </span>
                  }
                />
              ) : null}
              <MetaItem label="Role" value={role} />
              <MetaItem
                label="Location"
                value={
                  location ? (
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="size-3.5 text-muted-foreground" />
                      {[location.country, location.timezone]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <MetaItem
                label="Preferred communication"
                value={
                  comms ? (
                    <span className="flex items-center gap-1.5">
                      <MessageSquareIcon className="size-3.5 text-muted-foreground" />
                      {comms}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Separator />
              <MetaItem label="Industry" value={industry} />
              <MetaItem label="Business stage" value={businessStage} />
              <MetaItem
                label="Selected work"
                value={
                  client.summary.selectedWork.length ? (
                    <span className="flex flex-wrap gap-1">
                      {client.summary.selectedWork.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercial</CardTitle>
            <CardDescription>Agreement and billing snapshot.</CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate("agreement")}
              >
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <MetaItem label="Plan" value={client.engagement?.plan || "—"} />
              <MetaItem
                label="Setup"
                value={formatMoney(
                  client.engagement?.currency,
                  client.engagement?.setupFee,
                )}
              />
              <MetaItem
                label="Recurring"
                value={
                  client.engagement?.recurringFee
                    ? `${formatMoney(client.engagement.currency, client.engagement.recurringFee)} / mo`
                    : "—"
                }
              />
              <MetaItem
                label="Scope items"
                value={client.engagement?.scope.length ?? 0}
              />
              <div className="col-span-2 flex flex-wrap gap-2">
                <Badge
                  variant={
                    client.engagement?.signedAgreementRef
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {client.engagement?.signedAgreementRef
                    ? "Agreement signed"
                    : "Agreement missing"}
                </Badge>
                <Badge
                  variant={
                    client.engagement?.advancePaymentRef
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {client.engagement?.advancePaymentRef
                    ? "Advance verified"
                    : "Advance unverified"}
                </Badge>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              {client.documents.length
                ? `${client.documents.length} uploaded file${client.documents.length === 1 ? "" : "s"}.`
                : "No client files yet."}
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate("files")}
              >
                View
              </Button>
            </CardAction>
          </CardHeader>
          {latestFile ? (
            <CardContent className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileTextIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{latestFile.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {latestFile.category} · {relativeTime(latestFile.uploadedAt)}
                </p>
              </div>
              <DocumentStatusBadge status={latestFile.status} />
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent updates</CardTitle>
            <CardDescription>Visible to the client.</CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate("activity")}
              >
                Timeline
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {nextActivity.length ? (
              nextActivity.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)} · {titleCase(item.actor)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No persisted activity yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={checksOpen} onOpenChange={setChecksOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Data completeness checklist</DialogTitle>
            <DialogDescription>
              Every tracked client data point, grouped by area. Open a tab to fix
              the missing item.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {(["Account", "Brief", "Commercial", "Delivery", "Files"] as const).map(
              (group) => {
                const items = client.checks.filter(
                  (check) => check.group === group,
                );
                if (!items.length) return null;
                return (
                  <div key={group} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {group}
                    </p>
                    {items.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-start gap-2 rounded-lg border p-2.5"
                      >
                        {check.status === "complete" ? (
                          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        ) : check.status === "missing" ? (
                          <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                        ) : (
                          <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium">{check.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {check.detail}
                          </span>
                        </div>
                        {check.status !== "complete" ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              onNavigate(check.tab);
                              setChecksOpen(false);
                            }}
                          >
                            Open
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              },
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function answerText(
  answers: NonNullable<ClientDetail["draft"]>["answers"],
  id: string,
) {
  const answer = answers[id];
  if (!answer || answer.state !== "answered") return "";
  if (typeof answer.value === "string") return answer.value.trim();
  if (Array.isArray(answer.value)) return answer.value.join(", ");
  if (typeof answer.value === "number") return String(answer.value);
  if (typeof answer.value === "boolean") return answer.value ? "Confirmed" : "";
  return Object.values(answer.value).filter(Boolean).join(" · ");
}

function answerRecord(
  answers: NonNullable<ClientDetail["draft"]>["answers"],
  id: string,
): Record<string, string> | null {
  const value = answers[id]?.value;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}
