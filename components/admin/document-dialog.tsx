"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ClientDetail } from "@/lib/admin/types";
import { DOCUMENT_CATEGORIES } from "@/lib/onboarding/documents";
import { errorMessage } from "@/lib/admin/format";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";

type Document = ClientDetail["documents"][number];

const STATUSES = [
  { value: "received", label: "Received" },
  { value: "reviewed", label: "Reviewed" },
  { value: "needs-update", label: "Needs update" },
  { value: "approved", label: "Approved" },
] as const;

export function DocumentDialog({
  document,
  open,
  onOpenChange,
}: {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateDocument = useMutation(api.clients.updateDocument);
  const toast = useToastManager();
  const [status, setStatus] = useState<Document["status"]>(
    document?.status ?? "received",
  );
  const [category, setCategory] = useState<string>(
    document?.category ?? DOCUMENT_CATEGORIES[0],
  );
  const [description, setDescription] = useState(document?.description ?? "");
  const [saving, setSaving] = useState(false);

  if (!document) return null;

  async function save() {
    if (!document) return;
    setSaving(true);
    try {
      await updateDocument({
        documentId: document.id,
        status,
        category,
        description,
      });
      toast.add({
        title: "File updated",
        description: `${document.fileName} is now marked ${status.replace("-", " ")}.`,
        type: "success",
      });
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: "Could not update the file",
        description: errorMessage(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review file</DialogTitle>
          <DialogDescription>{document.fileName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Review status">
            <NativeSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as Document["status"])
              }
            >
              {STATUSES.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Category">
            <NativeSelect
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {option}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Note for the client"
            hint="Shown with the file in the client's workspace."
          >
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Checked against the approved brief."
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
