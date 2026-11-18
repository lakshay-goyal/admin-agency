"use client";

import { useRef, useState } from "react";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CopyIcon, LoaderCircleIcon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { ClientDetail } from "@/lib/admin/types";
import { buildOnboardingMarkdown, type RetainedOnboardingAnswer } from "@/lib/admin/onboarding-markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";

export function CopyOnboardingButton({ client }: { client: ClientDetail }) {
  const convex = useConvex();
  const toast = useToastManager();
  const [copying, setCopying] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function copyOnboarding() {
    setCopying(true);
    try {
      const retained: RetainedOnboardingAnswer[] = [];
      let cursor: string | null = null;
      for (;;) {
        const result: FunctionReturnType<typeof api.clients.getRetainedOnboardingAnswers> = await convex.query(api.clients.getRetainedOnboardingAnswers, {
          authUserId: client.authUserId,
          questionnaireVersion: client.questionnaire.version,
          paginationOpts: { cursor, numItems: 50 },
        });
        retained.push(...result.page);
        if (result.isDone) break;
        cursor = result.continueCursor;
      }
      const markdown = buildOnboardingMarkdown(client, retained);
      try {
        await navigator.clipboard.writeText(markdown);
        toast.add({ title: "Onboarding copied", description: "All onboarding questions and saved answers are ready to paste as Markdown.", type: "success" });
      } catch {
        setManualCopy(markdown);
      }
    } catch {
      toast.add({ title: "Could not export onboarding", description: "Please try again. If the questionnaire changed, reload this client first.", type: "error" });
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={copying} onClick={copyOnboarding} title="Copy all onboarding questions and answers as Markdown">
        {copying ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <CopyIcon data-icon="inline-start" />}
        {copying ? "Copying…" : "Copy Onboarding"}
      </Button>
      <Dialog open={manualCopy !== null} onOpenChange={open => { if (!open) setManualCopy(null); }}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy onboarding Markdown</DialogTitle>
            <DialogDescription>Your browser blocked clipboard access. Select the content below and press Ctrl+C or ⌘C to copy the complete export.</DialogDescription>
          </DialogHeader>
          <Textarea ref={textRef} aria-label="Complete onboarding Markdown" readOnly value={manualCopy ?? ""} className="h-64 resize-none font-mono text-xs sm:h-80" onFocus={event => event.currentTarget.select()} />
          <Button variant="outline" onClick={() => { textRef.current?.focus(); textRef.current?.select(); }}>Select all Markdown</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
