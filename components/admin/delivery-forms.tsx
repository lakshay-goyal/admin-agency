"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ClientDetail } from "@/lib/admin/types";
import {
  errorMessage,
  fromDateInput,
  toDateInput,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";

type Project = NonNullable<ClientDetail["project"]>;
type Stage = ClientDetail["stages"][number];

const PROJECT_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "in-progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "complete", label: "Complete" },
] as const;

const STAGE_STATUSES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "in-progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "blocked", label: "Needs attention" },
] as const;

export function ProjectDialog({
  authUserId,
  project,
  stages,
  open,
  onOpenChange,
}: {
  authUserId: string;
  project: Project | null;
  stages: Stage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateProject = useMutation(api.clients.updateProject);
  const toast = useToastManager();
  const [form, setForm] = useState(() => projectForm(project, stages));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ReturnType<typeof projectForm>>(
    key: K,
    value: ReturnType<typeof projectForm>[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateProject({
        authUserId,
        name: form.name,
        summary: form.summary,
        status: form.status,
        currentStage: form.currentStage,
        progressPercent: Number(form.progressPercent),
        nextStepTitle: form.nextStepTitle,
        nextStepDetail: form.nextStepDetail,
        startDate: form.startDate || null,
        targetDate: form.targetDate || null,
      });
      toast.add({
        title: "Project updated",
        description: "The client's progress and next step are now live.",
        type: "success",
      });
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: "Could not update the project",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const stageOptions = [
    ...stages.map((stage) => ({ value: stage.stageId, label: stage.title })),
  ];
  if (
    form.currentStage &&
    !stageOptions.some((stage) => stage.value === form.currentStage)
  ) {
    stageOptions.unshift({
      value: form.currentStage,
      label: form.currentStage,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit project summary</DialogTitle>
          <DialogDescription>
            This is the delivery record the client sees in their workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field label="Client-facing summary" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.summary}
              onChange={(event) => set("summary", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <NativeSelect
              value={form.status}
              onChange={(event) =>
                set("status", event.target.value as Project["status"])
              }
            >
              {PROJECT_STATUSES.map((status) => (
                <NativeSelectOption key={status.value} value={status.value}>
                  {status.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Current stage">
            <NativeSelect
              value={form.currentStage}
              onChange={(event) => set("currentStage", event.target.value)}
            >
              {stageOptions.map((stage) => (
                <NativeSelectOption key={stage.value} value={stage.value}>
                  {stage.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Overall progress (%)"
            hint="Stage edits recalculate this automatically. You can still set an exact value."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progressPercent}
              onChange={(event) =>
                set("progressPercent", Number(event.target.value))
              }
            />
          </Field>
          <Field label="Target date">
            <Input
              type="date"
              value={form.targetDate}
              onChange={(event) => set("targetDate", event.target.value)}
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) => set("startDate", event.target.value)}
            />
          </Field>
          <Field label="Next step title" className="sm:col-span-2">
            <Input
              value={form.nextStepTitle}
              onChange={(event) => set("nextStepTitle", event.target.value)}
            />
          </Field>
          <Field label="Next step detail" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.nextStepDetail}
              onChange={(event) => set("nextStepDetail", event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function projectForm(project: Project | null, stages: Stage[]) {
  return {
    name: project?.name ?? "",
    summary: project?.summary ?? "",
    status: project?.status ?? ("planning" as Project["status"]),
    currentStage: project?.currentStage ?? stages[0]?.stageId ?? "brief",
    progressPercent: project?.progressPercent ?? 0,
    nextStepTitle: project?.nextStepTitle ?? "",
    nextStepDetail: project?.nextStepDetail ?? "",
    startDate: project?.startDate ?? "",
    targetDate: project?.targetDate ?? "",
  };
}

export function StageDialog({
  authUserId,
  stage,
  open,
  onOpenChange,
}: {
  authUserId: string;
  stage: Stage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStage = useMutation(api.clients.updateStage);
  const toast = useToastManager();
  const [form, setForm] = useState(() => stageForm(stage));
  const [saving, setSaving] = useState(false);

  if (!stage) return null;

  function set<K extends keyof ReturnType<typeof stageForm>>(
    key: K,
    value: ReturnType<typeof stageForm>[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!stage) return;
    setSaving(true);
    try {
      await updateStage({
        authUserId,
        stageId: stage.stageId,
        title: form.title,
        description: form.description,
        status: form.status,
        progress: Number(form.progress),
        startedAt: fromDateInput(form.startedAt),
        completedAt: fromDateInput(form.completedAt),
        targetDate: form.targetDate || null,
        note: form.note,
        visible: form.visible,
      });
      toast.add({
        title: "Stage updated",
        description: `${form.title} is now ${form.status.replace("-", " ")} and the project progress has been recalculated.`,
        type: "success",
      });
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: "Could not update the stage",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit delivery stage</DialogTitle>
          <DialogDescription>
            Changes appear in the client&apos;s project journey immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <Field label="Client-facing description" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <NativeSelect
              value={form.status}
              onChange={(event) =>
                set("status", event.target.value as Stage["status"])
              }
            >
              {STAGE_STATUSES.map((status) => (
                <NativeSelectOption key={status.value} value={status.value}>
                  {status.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Progress (%)"
            hint={
              form.status === "complete"
                ? "Completed stages are saved at 100%."
                : form.status === "upcoming"
                  ? "Upcoming stages are saved at 0%."
                  : "How far along this stage is."
            }
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              disabled={form.status === "complete" || form.status === "upcoming"}
              onChange={(event) => set("progress", Number(event.target.value))}
            />
          </Field>
          <Field label="Started">
            <Input
              type="date"
              value={form.startedAt}
              onChange={(event) => set("startedAt", event.target.value)}
            />
          </Field>
          <Field label="Completed">
            <Input
              type="date"
              value={form.completedAt}
              onChange={(event) => set("completedAt", event.target.value)}
            />
          </Field>
          <Field label="Target date">
            <Input
              type="date"
              value={form.targetDate}
              onChange={(event) => set("targetDate", event.target.value)}
            />
          </Field>
          <Field
            label="Visible to client"
            hint="Hide a stage while you prepare it."
            className="justify-between"
          >
            <Switch
              checked={form.visible}
              onCheckedChange={(checked) => set("visible", checked)}
            />
          </Field>
          <Field label="Internal / client note" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.note}
              onChange={(event) => set("note", event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function stageForm(stage: Stage | null) {
  return {
    title: stage?.title ?? "",
    description: stage?.description ?? "",
    status: stage?.status ?? ("upcoming" as Stage["status"]),
    progress: stage?.progress ?? 0,
    startedAt: toDateInput(stage?.startedAt),
    completedAt: toDateInput(stage?.completedAt),
    targetDate: stage?.targetDate ?? "",
    note: stage?.note ?? "",
    visible: stage?.visible ?? true,
  };
}
