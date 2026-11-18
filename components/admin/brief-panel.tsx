"use client";

import { useState } from "react";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  PencilIcon,
  SearchIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ClientDetail } from "@/lib/admin/types";
import type { Answer, AnswerState, Question } from "@/lib/onboarding/types";
import {
  DISPLAY_STATE_LABELS,
  formatQuestionAnswer,
  getClientPhases,
  getInactiveAnsweredPages,
  getModulePages,
  getOpenItemIds,
  moduleTitle,
} from "@/lib/admin/onboarding";
import {
  createQuestionnaire,
  isAnswerEmpty,
} from "@/lib/onboarding/engine";
import { relativeTime } from "@/lib/admin/format";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { AnswerStateBadge } from "@/components/admin/status-badges";
import { AnswerDialog } from "@/components/admin/answer-dialog";
import { MiniProgress } from "@/components/admin/admin-ui";
import { useToastManager } from "@/components/ui/toast";

type Filter = "all" | "attention" | "missing" | "answered" | "follow-ups";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All questions" },
  { value: "attention", label: "Needs attention" },
  { value: "missing", label: "Missing answers" },
  { value: "answered", label: "Answered" },
  { value: "follow-ups", label: "Follow-ups" },
];

export function BriefPanel({ client }: { client: ClientDetail }) {
  const answers = client.draft?.answers ?? {};
  const extras = client.draft?.extraModules ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Question | null>(null);

  const openItemIds = getOpenItemIds(client.questionnaire.definition, answers, extras);
  const phases = getClientPhases(client.questionnaire.definition, answers, extras);
  const inactivePages = getInactiveAnsweredPages(client.questionnaire.definition, answers, extras);

  const normalizedQuery = query.trim().toLowerCase();

  function matches(question: Question, answer: Answer | undefined) {
    const missing = !answer || isAnswerEmpty(answer);
    const followUp =
      openItemIds.has(question.id) ||
      (answer && answer.state !== "answered");

    if (filter === "missing" && !missing) return false;
    if (filter === "attention" && !missing && !followUp) return false;
    if (filter === "answered" && (!answer || missing)) return false;
    if (filter === "follow-ups" && !followUp) return false;

    if (!normalizedQuery) return true;
    const haystack = [
      question.id,
      question.label,
      formatQuestionAnswer(question, answer),
      answer?.detail ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  }

  const filteredPhases = phases
    .map((phase) => ({
      ...phase,
      questions: phase.questions.filter(({ question, answer }) =>
        matches(question, answer),
      ),
    }))
    .filter((phase) => phase.questions.length);

  const filteredInactive = inactivePages
    .map((page) => ({
      ...page,
      questions: page.questions.filter((question) =>
        matches(question, answers[question.id]),
      ),
    }))
    .filter((page) => page.questions.length);

  const allLiveQuestions = phases.flatMap((phase) => phase.questions);
  const answered = allLiveQuestions.filter(
    ({ answer }) => answer?.state === "answered" && !isAnswerEmpty(answer),
  ).length;
  const missing = allLiveQuestions.filter(
    ({ answer }) => !answer || isAnswerEmpty(answer),
  ).length;
  const followUps = allLiveQuestions.filter(
    ({ question, answer }) =>
      openItemIds.has(question.id) || (answer && answer.state !== "answered"),
  ).length;

  const defaultOpen = phases.find((phase) => !phase.complete)?.id;

  if (!client.draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No brief yet</CardTitle>
          <CardDescription>
            This client has not saved any onboarding answers. There is nothing
            to review or edit until they start their brief.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheckIcon className="size-4 text-emerald-600" />
            {answered} of {allLiveQuestions.length} answers recorded
          </CardTitle>
          <CardDescription>
            {missing
              ? `${missing} visible question${missing === 1 ? "" : "s"} still need an answer.`
              : "Every visible question has an answer or an explicit follow-up state."}
            {followUps
              ? ` ${followUps} follow-up${followUps === 1 ? "" : "s"} need clarification.`
              : ""}
          </CardDescription>
          <CardAction>
            <Badge variant={missing || followUps ? "destructive" : "secondary"}>
              {client.progress.percent}% brief complete
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <MiniProgress value={client.progress.percent} />
          <div className="flex flex-wrap gap-2">
            {(
              [
                "unknown",
                "deferred",
                "not-applicable",
                "help",
              ] as AnswerState[]
            )
              .filter((state) => client.answerStates[state] > 0)
              .map((state) => (
                <Badge key={state} variant="outline">
                  {DISPLAY_STATE_LABELS[state]}: {client.answerStates[state]}
                </Badge>
              ))}
            {client.draft.extraModules.length ? (
              <Badge variant="ghost">
                <WorkflowIcon data-icon="inline-start" />
                Extra workflows: {client.draft.extraModules.join(", ")}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Last saved {relativeTime(client.draft.updatedAt)} ·{" "}
            {client.draft.status === "submitted"
              ? `Submitted ${relativeTime(client.draft.submittedAt)}`
              : "Not submitted yet"}{" "}
            · Version {client.draft.version} · Editing an answer does not reset
            the client&apos;s submitted status.
          </p>
        </CardContent>
      </Card>

      <WorkflowRouteCard client={client} answers={answers} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions, IDs, or answers…"
            className="pl-8"
          />
        </div>
        <NativeSelect
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          className="w-full sm:w-48"
        >
          {FILTERS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {filteredPhases.length || filteredInactive.length ? (
        <Card className="gap-1 py-2">
          <Accordion multiple defaultValue={defaultOpen ? [defaultOpen] : []}>
            {filteredPhases.map((phase) => (
              <AccordionItem key={phase.id} value={phase.id} className="px-3">
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{phase.title}</span>
                    {phase.service ? (
                      <Badge variant="outline">Workflow</Badge>
                    ) : null}
                    {phase.complete ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <Badge variant="destructive">
                        {phase.completed}/{phase.total}
                      </Badge>
                    )}
                    <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
                      {phase.percent}%
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="flex flex-col gap-2">
                    {phase.questions.map(({ question, answer }) => (
                      <QuestionRow
                        key={question.id}
                        question={question}
                        answer={answer}
                        followUp={openItemIds.has(question.id)}
                        onEdit={() => setEditing(question)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}

            {filteredInactive.length ? (
              <AccordionItem value="inactive" className="px-3">
                <AccordionTrigger>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      Saved answers outside the current route
                    </span>
                    <Badge variant="outline">{filteredInactive.length} pages</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <p className="mb-3 text-xs text-muted-foreground">
                    These answers are preserved in the database but are not
                    visible in the client&apos;s current questionnaire because
                    that workflow is no longer selected.
                  </p>
                  <div className="flex flex-col gap-4">
                    {filteredInactive.map((page) => (
                      <div key={page.id} className="flex flex-col gap-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {page.id} · {page.title}
                        </p>
                        {page.questions.map((question) => (
                          <QuestionRow
                            key={question.id}
                            question={question}
                            answer={answers[question.id]}
                            followUp={openItemIds.has(question.id)}
                            onEdit={() => setEditing(question)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No questions match this search or filter.
          </CardContent>
        </Card>
      )}

      {editing ? (
        <AnswerDialog
          key={`${client.authUserId}:${client.questionnaire.version}:${editing.id}`}
          authUserId={client.authUserId}
          questionnaireVersion={client.questionnaire.version}
          question={client.questionnaire.definition.pages.flatMap(page => page.questions).find(question => question.id === editing.id) ?? null}
          answer={answers[editing.id]}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function WorkflowRouteCard({
  client,
  answers,
}: {
  client: ClientDetail;
  answers: NonNullable<ClientDetail["draft"]>["answers"];
}) {
  const updateExtraModules = useMutation(api.clients.updateExtraModules);
  const toast = useToastManager();
  const extras = client.draft?.extraModules ?? [];
  const derived = createQuestionnaire(client.questionnaire.definition).getSelectedModules(answers, []);
  const [adding, setAdding] = useState("");
  const [saving, setSaving] = useState(false);
  const modules = getModulePages(client.questionnaire.definition).filter(
    (page) => !derived.includes(page.id) && !extras.includes(page.id),
  );

  async function save(next: string[]) {
    setSaving(true);
    try {
      await updateExtraModules({
        authUserId: client.authUserId,
        extraModules: next,
        questionnaireVersion: client.questionnaire.version,
      });
      toast.add({
        title: "Workflow route updated",
        description: "The client's questionnaire route has been recalculated.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not update the route",
        description: error instanceof Error ? error.message : "Try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WorkflowIcon className="size-4" />
          Workflow route
        </CardTitle>
        <CardDescription>
          Workflows are selected automatically from the client&apos;s answers.
          Add an extra workflow only when the scope requires it.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">
            {client.summary.selectedModules.length} active
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {client.summary.selectedModules.map((id) => (
            <Badge key={id} variant="secondary">
              {id} · {moduleTitle(client.questionnaire.definition, id)}
            </Badge>
          ))}
          {!client.summary.selectedModules.length ? (
            <span className="text-sm text-muted-foreground">
              No workflow modules are active.
            </span>
          ) : null}
        </div>
        {extras.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Manually added:</span>
            {extras.map((id) => (
              <Badge key={id} variant="outline" className="gap-1">
                {id} · {moduleTitle(client.questionnaire.definition, id)}
                <button
                  type="button"
                  aria-label={`Remove ${id}`}
                  disabled={saving}
                  onClick={() => save(extras.filter((item) => item !== id))}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        {modules.length ? (
          <div className="flex flex-wrap items-end gap-2">
            <NativeSelect
              value={adding}
              onChange={(event) => setAdding(event.target.value)}
              className="min-w-56 flex-1"
            >
              <NativeSelectOption value="">Add a workflow…</NativeSelectOption>
              {modules.map((page) => (
                <NativeSelectOption key={page.id} value={page.id}>
                  {page.id} · {page.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              size="sm"
              variant="outline"
              disabled={!adding || saving}
              onClick={() => {
                if (!adding) return;
                void save([...extras, adding]).then(() => setAdding(""));
              }}
            >
              Add workflow
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuestionRow({
  question,
  answer,
  followUp,
  onEdit,
}: {
  question: Question;
  answer: Answer | undefined;
  followUp: boolean;
  onEdit: () => void;
}) {
  const missing = !answer || isAnswerEmpty(answer);
  return (
    <div className="group flex flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="ghost" className="font-mono text-[10px]">
            {question.id}
          </Badge>
          <span className="text-sm font-medium">{question.label}</span>
          {question.required ? (
            <span className="text-xs text-muted-foreground">Required</span>
          ) : null}
        </div>
        <p
          className={
            missing
              ? "text-sm text-muted-foreground italic"
              : "text-sm text-muted-foreground"
          }
        >
          {formatQuestionAnswer(question, answer)}
        </p>
        {followUp && answer?.detail ? (
          <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <CircleAlertIcon className="mt-0.5 size-3 shrink-0" />
            {answer.detail}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {missing ? (
          <Badge variant="destructive">
            <CircleAlertIcon data-icon="inline-start" />
            Missing
          </Badge>
        ) : answer ? (
          <AnswerStateBadge state={answer.state} />
        ) : null}
        {followUp && answer?.state === "answered" ? (
          <Badge variant="outline">
            <CircleDashedIcon data-icon="inline-start" />
            Follow-up
          </Badge>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          aria-label={`Edit ${question.id}`}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </div>
    </div>
  );
}
