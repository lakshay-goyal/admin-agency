"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CircleDotIcon,
  FileTextIcon,
  MilestoneIcon,
  SendIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import type { ClientDetail } from "@/lib/admin/types";
import {
  errorMessage,
  formatDateTime,
  relativeTime,
  titleCase,
} from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";

const TYPES = [
  { value: "stage", label: "Progress update" },
  { value: "brief", label: "Brief update" },
  { value: "document", label: "File update" },
  { value: "engagement", label: "Agreement update" },
  { value: "system", label: "General update" },
] as const;

const VIEWS = [
  { value: "journey", label: "Project journey" },
  { value: "overview", label: "Overview" },
  { value: "brief", label: "Project brief" },
  { value: "agreement", label: "Agreement" },
  { value: "resources", label: "Files" },
] as const;

const PRESETS = [
  {
    label: "Progress update",
    title: "Design review scheduled",
    detail: "We have scheduled the next review. Details are in your workspace.",
    type: "stage" as const,
    view: "journey",
  },
  {
    label: "Waiting on client",
    title: "We need your input",
    detail: "Please review the latest message and reply when you can.",
    type: "system" as const,
    view: "overview",
  },
  {
    label: "Decision needed",
    title: "A decision is needed",
    detail: "Please confirm the preferred option so we can continue.",
    type: "stage" as const,
    view: "journey",
  },
] as const;

export function ActivityPanel({ client }: { client: ClientDetail }) {
  const addActivity = useMutation(api.clients.addActivity);
  const toast = useToastManager();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("stage");
  const [view, setView] = useState<(typeof VIEWS)[number]["value"]>("journey");
  const [saving, setSaving] = useState(false);

  async function publish() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addActivity({
        authUserId: client.authUserId,
        type,
        title,
        detail,
        view,
      });
      toast.add({
        title: "Update published",
        description: "The client can see this in their activity timeline.",
        type: "success",
      });
      setTitle("");
      setDetail("");
    } catch (error) {
      toast.add({
        title: "Could not publish the update",
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
          <CardTitle>Publish an update</CardTitle>
          <CardDescription>
            This is appended to the client&apos;s persisted activity timeline.
            Keep it specific and client-safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="xs"
                variant="outline"
                onClick={() => {
                  setTitle(preset.title);
                  setDetail(preset.detail);
                  setType(preset.type);
                  setView(preset.view);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Field label="Title">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What changed?"
            />
          </Field>
          <Field label="Detail">
            <Textarea
              rows={3}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="What should the client know or do next?"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Update type">
              <NativeSelect
                value={type}
                onChange={(event) =>
                  setType(event.target.value as typeof type)
                }
              >
                {TYPES.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Client view">
              <NativeSelect
                value={view}
                onChange={(event) =>
                  setView(event.target.value as typeof view)
                }
              >
                {VIEWS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={publish} disabled={saving || !title.trim()}>
              <SendIcon data-icon="inline-start" />
              {saving ? "Publishing…" : "Publish update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
          <CardDescription>
            {client.activity.length
              ? `${client.activity.length} persisted update${client.activity.length === 1 ? "" : "s"}, newest first.`
              : "No updates have been published yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.activity.length ? (
            <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
              {client.activity.map((item) => (
                <li key={item.id} className="relative flex gap-3">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <ActivityTypeIcon type={item.type} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge
                        variant={
                          item.actor === "agency"
                            ? "secondary"
                            : item.actor === "client"
                              ? "outline"
                              : "ghost"
                        }
                      >
                        {titleCase(item.actor)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                    {item.detail ? (
                      <p className="text-sm text-muted-foreground">
                        {item.detail}
                      </p>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                      {item.view ? ` · ${titleCase(item.view)}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CircleDotIcon className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Publish the first update above. It will appear in the
                client&apos;s workspace immediately.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTypeIcon({
  type,
}: {
  type: "brief" | "stage" | "document" | "engagement" | "system";
}) {
  if (type === "stage") return <MilestoneIcon className="size-4" />;
  if (type === "document") return <FileTextIcon className="size-4" />;
  if (type === "engagement") return <WalletIcon className="size-4" />;
  if (type === "brief") return <FileTextIcon className="size-4" />;
  return <SparklesIcon className="size-4" />;
}
