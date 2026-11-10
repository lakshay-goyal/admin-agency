import { Badge } from "@/components/ui/badge";
import type { AnswerState } from "@/lib/onboarding/types";

export function BriefStatusBadge({
  status,
}: {
  status: "draft" | "submitted" | null;
}) {
  if (status === "submitted") {
    return <Badge variant="secondary">Brief submitted</Badge>;
  }
  if (status === "draft") {
    return <Badge variant="outline">Brief in progress</Badge>;
  }
  return <Badge variant="outline">No brief yet</Badge>;
}

export function ProjectStatusBadge({
  status,
}: {
  status: "planning" | "in-progress" | "blocked" | "complete" | null;
}) {
  if (status === "complete") return <Badge variant="secondary">Complete</Badge>;
  if (status === "blocked") return <Badge variant="destructive">Blocked</Badge>;
  if (status === "in-progress") return <Badge>In progress</Badge>;
  if (status === "planning") return <Badge variant="outline">Planning</Badge>;
  return <Badge variant="ghost">No project</Badge>;
}

export function StageStatusBadge({
  status,
}: {
  status: "upcoming" | "in-progress" | "complete" | "blocked";
}) {
  if (status === "complete") return <Badge variant="secondary">Complete</Badge>;
  if (status === "blocked") return <Badge variant="destructive">Needs attention</Badge>;
  if (status === "in-progress") return <Badge>In progress</Badge>;
  return <Badge variant="outline">Upcoming</Badge>;
}

export function DocumentStatusBadge({
  status,
}: {
  status: "received" | "reviewed" | "needs-update" | "approved";
}) {
  if (status === "approved") return <Badge variant="secondary">Approved</Badge>;
  if (status === "reviewed") return <Badge>Reviewed</Badge>;
  if (status === "needs-update")
    return <Badge variant="destructive">Needs update</Badge>;
  return <Badge variant="outline">Received</Badge>;
}

export function AnswerStateBadge({ state }: { state: AnswerState }) {
  if (state === "answered") return <Badge variant="secondary">Answered</Badge>;
  if (state === "help") return <Badge variant="destructive">Needs discussion</Badge>;
  if (state === "not-applicable")
    return <Badge variant="ghost">Not applicable</Badge>;
  if (state === "deferred") return <Badge variant="outline">Provide later</Badge>;
  return <Badge variant="outline">Not sure yet</Badge>;
}

export function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <Badge variant="outline">No plan</Badge>;
  return <Badge variant="secondary">{plan}</Badge>;
}
