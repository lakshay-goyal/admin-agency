"use client";

import { useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  PencilIcon,
  UploadCloudIcon,
} from "lucide-react";
import type { ClientDetail } from "@/lib/admin/types";
import { formatFileSize, formatDateTime } from "@/lib/admin/format";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentStatusBadge } from "@/components/admin/status-badges";
import { DocumentDialog } from "@/components/admin/document-dialog";

type Document = ClientDetail["documents"][number];

export function FilesPanel({ client }: { client: ClientDetail }) {
  const [editing, setEditing] = useState<Document | null>(null);
  const counts = client.documents.reduce<Record<string, number>>(
    (total, document) => {
      total[document.status] = (total[document.status] ?? 0) + 1;
      return total;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Client files</CardTitle>
          <CardDescription>
            Files are uploaded by the client from their workspace. Review the
            file, change its category, or leave a note for the client.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">
              {client.documents.length} file
              {client.documents.length === 1 ? "" : "s"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["received", "reviewed", "needs-update", "approved"] as const).map(
            (status) =>
              counts[status] ? (
                <Badge
                  key={status}
                  variant={status === "needs-update" ? "destructive" : "outline"}
                >
                  {status.replace("-", " ")}: {counts[status]}
                </Badge>
              ) : null,
          )}
          {!client.documents.length ? (
            <span className="text-sm text-muted-foreground">
              No files have been uploaded.
            </span>
          ) : null}
        </CardContent>
      </Card>

      {client.documents.length ? (
        <div className="flex flex-col gap-2">
          {client.documents.map((document) => (
            <Card key={document.id} size="sm">
              <CardContent className="flex flex-wrap items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <DocumentIcon contentType={document.contentType} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium break-all">
                      {document.fileName}
                    </span>
                    <DocumentStatusBadge status={document.status} />
                    <Badge variant="ghost">{document.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(document.size)} · Uploaded by{" "}
                    {document.uploadedBy} · {formatDateTime(document.uploadedAt)}
                  </p>
                  {document.description ? (
                    <p className="text-sm text-muted-foreground">
                      {document.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {document.url ? (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                    >
                      <DownloadIcon data-icon="inline-start" />
                      Open
                    </a>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      <DownloadIcon data-icon="inline-start" />
                      Unavailable
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(document)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <UploadCloudIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No client files yet</p>
              <p className="text-sm text-muted-foreground">
                The client can upload brand assets, content, and technical
                documents from their workspace. They will appear here for
                review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {editing ? (
        <DocumentDialog
          key={editing.id}
          document={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DocumentIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) {
    return <ImageIcon className="size-5" />;
  }
  if (
    contentType.includes("pdf") ||
    contentType.includes("text") ||
    contentType.includes("word")
  ) {
    return <FileTextIcon className="size-5" />;
  }
  return <FileIcon className="size-5" />;
}
