"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CalendarDaysIcon,
  EyeOffIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";
import type { ClientDetail } from "@/lib/admin/types";
import {
  errorMessage,
  formatDateTime,
  formatDay,
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
import { MiniProgress } from "@/components/admin/admin-ui";
import {
  ProjectStatusBadge,
  StageStatusBadge,
} from "@/components/admin/status-badges";
import { ProjectDialog, StageDialog } from "@/components/admin/delivery-forms";
import { useToastManager } from "@/components/ui/toast";

export function DeliveryPanel({
  client,
  initialProjectOpen = false,
}: {
  client: ClientDetail;
  initialProjectOpen?: boolean;
}) {
  const [projectOpen, setProjectOpen] = useState(initialProjectOpen);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [creatingStages, setCreatingStages] = useState(false);
  const ensureStages = useMutation(api.clients.ensureStages);
  const toast = useToastManager();
  const editingStage =
    client.stages.find((stage) => stage.stageId === editingStageId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" />
            Delivery summary
          </CardTitle>
          <CardDescription>
            Progress is persisted in the database and shown to the client as
            soon as you save.
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProjectOpen(true)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit project
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={client.project?.status ?? null} />
            {client.project?.currentStage ? (
              <Badge variant="outline">Current: {client.project.currentStage}</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              Updated {relativeTime(client.project?.updatedAt)}
            </span>
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

          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Next step
              </span>
              <span className="text-sm font-medium">
                {client.project?.nextStepTitle || "No next step set"}
              </span>
              <span className="text-sm text-muted-foreground">
                {client.project?.nextStepDetail || "—"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Start</dt>
                <dd>{client.project?.startDate || "Not set"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Target</dt>
                <dd>{client.project?.targetDate || "Not set"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Stages</dt>
                <dd>
                  {client.stages.filter((stage) => stage.status === "complete").length}{" "}
                  of {client.stages.length} complete
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="truncate">{client.project?.name || "Not created"}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">Delivery stages</h2>
          <p className="text-sm text-muted-foreground">
            Update a stage to recalculate overall project progress and the
            current stage. Hidden stages stay out of the client&apos;s journey.
          </p>
        </div>
        {client.stages.length ? (
          client.stages.map((stage, index) => (
            <Card key={stage.stageId}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  {stage.title}
                  <StageStatusBadge status={stage.status} />
                  {!stage.visible ? (
                    <Badge variant="ghost">
                      <EyeOffIcon data-icon="inline-start" />
                      Hidden
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{stage.description}</CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingStageId(stage.stageId)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <MiniProgress value={stage.progress} className="flex-1" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {stage.progress}%
                  </span>
                </div>
                {stage.note ? (
                  <p className="rounded-lg bg-muted/50 p-2.5 text-sm">
                    {stage.note}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="size-3.5" />
                    Started:{" "}
                    {stage.startedAt
                      ? formatDateTime(stage.startedAt)
                      : "Not started"}
                  </span>
                  <span>
                    Completed:{" "}
                    {stage.completedAt
                      ? formatDateTime(stage.completedAt)
                      : "Not yet"}
                  </span>
                  {stage.targetDate ? (
                    <span>Target: {formatDay(stage.targetDate)}</span>
                  ) : null}
                  <span>Updated {relativeTime(stage.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-start gap-2 py-8">
              <p className="text-sm font-medium">No delivery stages yet</p>
              <p className="text-sm text-muted-foreground">
                The workspace normally seeds six stages when the brief is
                submitted. Create the project summary to start, then stages can
                be added by the workspace.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setProjectOpen(true)}>
                  {client.project ? "Edit project summary" : "Create project summary"}
                </Button>
                {client.project ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={creatingStages}
                    onClick={async () => {
                      setCreatingStages(true);
                      try {
                        await ensureStages({ authUserId: client.authUserId });
                        toast.add({
                          title: "Delivery stages created",
                          description: "The standard six-stage plan is ready to edit.",
                          type: "success",
                        });
                      } catch (error) {
                        toast.add({
                          title: "Could not create the stages",
                          description: errorMessage(error),
                          type: "error",
                        });
                      } finally {
                        setCreatingStages(false);
                      }
                    }}
                  >
                    {creatingStages ? "Creating…" : "Create default stages"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {projectOpen ? (
        <ProjectDialog
          authUserId={client.authUserId}
          project={client.project}
          stages={client.stages}
          open
          onOpenChange={setProjectOpen}
        />
      ) : null}
      {editingStage ? (
        <StageDialog
          key={editingStage.stageId}
          authUserId={client.authUserId}
          stage={editingStage}
          open
          onOpenChange={(open) => {
            if (!open) setEditingStageId(null);
          }}
        />
      ) : null}
    </div>
  );
}
