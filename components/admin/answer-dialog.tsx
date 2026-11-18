"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getOptionLabel } from "@/lib/onboarding/engine";
import type { Answer, AnswerState, Question } from "@/lib/onboarding/types";
import {
  DISPLAY_STATE_LABELS,
  defaultValueForQuestion,
  formatQuestionAnswer,
  getAllowedStates,
} from "@/lib/admin/onboarding";
import { errorMessage } from "@/lib/admin/format";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const ASSET_STATUS_OPTIONS = [
  { value: "ready", label: "Ready" },
  { value: "needs-updating", label: "Needs updating" },
  { value: "needs-help", label: "Needs help" },
  { value: "not-available", label: "Not available" },
];

function isRecord(value: Answer["value"]): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function AnswerDialog({
  authUserId,
  questionnaireVersion,
  question,
  answer,
  open,
  onOpenChange,
}: {
  authUserId: string;
  questionnaireVersion: string;
  question: Question | null;
  answer: Answer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAnswer = useMutation(api.clients.updateAnswer);
  const toast = useToastManager();
  const [state, setState] = useState<AnswerState>(answer?.state ?? "answered");
  const [value, setValue] = useState<Answer["value"]>(
    () => answer?.value ?? (question ? defaultValueForQuestion(question) : ""),
  );
  const [detail, setDetail] = useState(answer?.detail ?? "");
  const [priority, setPriority] = useState(answer?.priority ?? "");
  const [saving, setSaving] = useState(false);

  const states = useMemo(
    () => (question ? getAllowedStates(question) : []),
    [question],
  );

  if (!question) return null;

  async function save() {
    setSaving(true);
    try {
      await updateAnswer({
        authUserId,
        questionnaireVersion,
        questionId: question!.id,
        answer: {
          state,
          value,
          ...(detail.trim() ? { detail: detail.trim() } : {}),
          ...(priority ? { priority } : {}),
        },
      });
      toast.add({
        title: "Answer saved",
        description: `${question!.id} now reads: ${formatQuestionAnswer(question!, {
          state,
          value,
        })}`,
        type: "success",
      });
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: "Could not save the answer",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question.label}</DialogTitle>
          <DialogDescription>
            {question.id} · {question.required ? "Required" : "Optional"} · edits
            are saved to the client&apos;s brief and remain visible in their
            workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field
            label="Answer status"
            hint="A follow-up state keeps the question visible as an open item."
          >
            <NativeSelect
              className="w-full"
              value={state}
              onChange={(event) => setState(event.target.value as AnswerState)}
            >
              {states.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {DISPLAY_STATE_LABELS[option]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          {state === "answered" ? (
            <AnswerValueEditor
              question={question}
              value={value}
              onChange={setValue}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              The saved value is retained but marked as{" "}
              <span className="font-medium text-foreground">
                {DISPLAY_STATE_LABELS[state].toLowerCase()}
              </span>
              . Add context below so the team knows what is needed.
            </div>
          )}

          {question.priority && state === "answered" && Array.isArray(value) ? (
            <Field label="First priority">
              <NativeSelect
                className="w-full"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <NativeSelectOption value="">No priority chosen</NativeSelectOption>
                {value.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {item}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          <Field
            label="Admin note / client context"
            hint="Optional. This is stored on the answer and shown in the brief."
          >
            <Textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              placeholder="Add clarification, a source, or the next follow-up."
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save answer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AnswerValueEditor({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Answer["value"];
  onChange: (value: Answer["value"]) => void;
}) {
  if (question.type === "checkbox") {
    return (
      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span className="text-sm">
          {question.acknowledgement
            ? "Client acknowledgement confirmed"
            : "Confirmed"}
        </span>
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </label>
    );
  }

  if (question.type === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    const options = [
      ...new Set([...(question.options ?? []), ...selected]),
    ].filter(Boolean);
    return (
      <Field
        label="Selected options"
        hint={question.help ?? "Toggle every option that applies."}
      >
        <div className="flex flex-wrap gap-2 rounded-lg border p-3">
          {options.map((option) => {
            const active = selected.some(
              (item) => item.toLowerCase() === option.toLowerCase(),
            );
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={active ? "secondary" : "outline"}
                aria-pressed={active}
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter(
                          (item) => item.toLowerCase() !== option.toLowerCase(),
                        )
                      : [...selected, option],
                  )
                }
              >
                {getOptionLabel(question, option)}
              </Button>
            );
          })}
          {!options.length ? (
            <span className="text-sm text-muted-foreground">
              No preset options. Add values below.
            </span>
          ) : null}
        </div>
        <Input
          className="mt-2"
          placeholder="Add another value and press Enter"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const next = event.currentTarget.value.trim();
            if (!next) return;
            onChange([...selected, next]);
            event.currentTarget.value = "";
          }}
        />
      </Field>
    );
  }

  if (question.type === "assets") {
    if (!question.options?.length) {
      const lines = Array.isArray(value) ? value.join("\n") : String(value ?? "");
      return (
        <Field
          label="Assets and context"
          hint="One asset, link, or note per line."
        >
          <Textarea
            rows={5}
            value={lines}
            onChange={(event) =>
              onChange(
                event.target.value
                  .split(/\r?\n/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
        </Field>
      );
    }
    const record = isRecord(value) ? value : {};
    return (
      <Field
        label="Asset readiness"
        hint="Mark only the assets that exist. Final files can be shared later."
      >
        <div className="flex flex-col divide-y rounded-lg border">
          {question.options.map((option) => {
            const selected = Object.prototype.hasOwnProperty.call(
              record,
              option,
            );
            return (
              <div
                key={option}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const next = { ...record };
                      if (checked) {
                        next[option] = ["Nothing yet", "Not sure"].includes(option)
                          ? "not-available"
                          : "ready";
                      } else {
                        delete next[option];
                      }
                      onChange(next);
                    }}
                  />
                  {getOptionLabel(question, option)}
                </label>
                {selected ? (
                  <NativeSelect
                    size="sm"
                    value={record[option] ?? "ready"}
                    onChange={(event) =>
                      onChange({ ...record, [option]: event.target.value })
                    }
                  >
                    {ASSET_STATUS_OPTIONS.map((status) => (
                      <NativeSelectOption key={status.value} value={status.value}>
                        {status.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : null}
              </div>
            );
          })}
        </div>
      </Field>
    );
  }

  if (question.fields?.length) {
    const record = isRecord(value) ? value : {};
    return (
      <Field
        label="Details"
        hint={question.help ?? "Update the individual fields below."}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {question.fields.map((field) => {
            const fieldValue = record[field.id] ?? "";
            const isLong =
              field.id === "now" ||
              field.id === "later" ||
              field.id === "setup" ||
              field.id === "recurring" ||
              field.label.toLowerCase().includes("description");
            return (
              <label
                key={field.id}
                className={cn(
                  "flex flex-col gap-1.5",
                  isLong && "sm:col-span-2",
                )}
              >
                <span className="text-sm font-medium">
                  {field.label}
                  {field.required ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </span>
                {isLong ? (
                  <Textarea
                    rows={field.id === "now" || field.id === "later" ? 3 : 2}
                    value={fieldValue}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      onChange({ ...record, [field.id]: event.target.value })
                    }
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "text" : field.type ?? "text"}
                    value={fieldValue}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      onChange({ ...record, [field.id]: event.target.value })
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
      </Field>
    );
  }

  if (question.type === "list") {
    const text = Array.isArray(value)
      ? value.join("\n")
      : typeof value === "string"
        ? value
        : "";
    return (
      <Field label="List" hint="One item per line.">
        <Textarea
          rows={5}
          value={text}
          onChange={(event) =>
            onChange(
              event.target.value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
        />
      </Field>
    );
  }

  if (question.type === "range") {
    return (
      <Field
        label="Value"
        hint={`Allowed range: ${question.minimum ?? 0}–${question.maximum ?? "any"}`}
      >
        <Input
          type="number"
          min={question.minimum}
          max={question.maximum}
          value={typeof value === "number" ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </Field>
    );
  }

  if (question.type === "textarea") {
    return (
      <Field label="Answer">
        <Textarea
          rows={5}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    );
  }

  const inputType =
    question.type === "email"
      ? "email"
      : question.type === "tel"
        ? "tel"
        : question.type === "url"
          ? "url"
          : question.type === "date"
            ? "date"
            : "text";

  return (
    <Field label="Answer" hint={question.help}>
      <Input
        type={inputType}
        value={
          typeof value === "string"
            ? value
            : typeof value === "number"
              ? String(value)
              : ""
        }
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder}
        list={question.options?.length ? `${question.id}-options` : undefined}
      />
      {question.options?.length ? (
        <datalist id={`${question.id}-options`}>
          {question.options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
      {question.presets?.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {question.presets.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => onChange(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}
