import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { ClientDetail } from "./types";
import type { Answer, Question } from "@/lib/onboarding/types";
import { createQuestionnaire, getOptionLabel } from "@/lib/onboarding/engine";
import { DISPLAY_STATE_LABELS } from "./onboarding";

export type RetainedOnboardingAnswer = FunctionReturnType<typeof api.clients.getRetainedOnboardingAnswers>["page"][number];

const assetStatuses: Record<string, string> = {
  ready: "Ready",
  "needs-updating": "Needs updating",
  "needs-help": "Needs help",
  "not-available": "Not available",
};

function escape(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[\\`*_{}\[\]<>#+!|]/g, "\\$&");
}

function heading(value: string) {
  return escape(value.replace(/\s+/g, " ").trim());
}

function quote(value: string) {
  return escape(value).split("\n").map(line => `> ${line}`).join("  \n");
}

function fieldLabel(question: Question, key: string) {
  const field = question.fields?.find(field => field.id === key);
  if (field) return field.label;
  // Workspace members repeat the same fields with numeric suffixes.
  if (question.id === "P15.2") {
    const match = key.match(/^(name|email|role|access)([2-9]|10)$/);
    const label = match && question.fields?.find(field => field.id === match[1])?.label;
    if (label) return `${label} (member ${match![2]})`;
  }
  return key;
}

function answerValue(question: Question, value: Answer["value"]): string {
  if (typeof value === "boolean") return value ? "Confirmed" : "Not confirmed";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim() ? getOptionLabel(question, value) : "Not answered";
  if (Array.isArray(value)) return value.length
    ? value.map(item => `• ${getOptionLabel(question, item)}`).join("\n")
    : "Not answered";
  const keys = [...new Set([...(question.fields?.map(field => field.id) ?? []), ...Object.keys(value)])];
  if (!keys.length) return "Not answered";
  return keys.map(key => {
    const label = question.type === "assets" ? getOptionLabel(question, key) : fieldLabel(question, key);
    const item = value[key] ?? "";
    const text = question.type === "assets" ? assetStatuses[item] ?? item : item;
    return `${label}: ${text.trim() ? text : "Not answered"}`;
  }).join("\n");
}

function questionMarkdown(question: Question, answer: Answer | undefined) {
  const parts = [`### ${heading(question.id)} — ${heading(question.label)}`];
  if (question.help) parts.push(`**Guidance:**\n\n${quote(question.help)}`);
  if (question.why) parts.push(`**Why we ask:**\n\n${quote(question.why)}`);
  if (question.placeholder) parts.push(`**Example / placeholder:**\n\n${quote(question.placeholder)}`);
  if (question.options?.length) parts.push(`**Choices offered:**\n\n${quote(question.options.map(option => {
    const description = question.optionDescriptions?.[option];
    return `• ${getOptionLabel(question, option)}${description ? ` — ${description}` : ""}`;
  }).join("\n"))}`);
  parts.push(`**Status:** ${answer ? DISPLAY_STATE_LABELS[answer.state] : "Not answered"}`);
  parts.push(`**Answer:**\n\n${quote(answer ? answerValue(question, answer.value) : "Not answered")}`);
  if (answer?.priority) parts.push(`**First priority:**\n\n${quote(getOptionLabel(question, answer.priority))}`);
  if (answer?.detail) parts.push(`**Additional details:**\n\n${quote(answer.detail)}`);
  return parts.join("\n\n");
}

/** Export the complete client snapshot, independently of the admin's filters. */
export function buildOnboardingMarkdown(client: ClientDetail, retained: RetainedOnboardingAnswer[] = []) {
  const { questionnaire, draft, summary, user } = client;
  const answers = draft?.answers ?? {};
  const pages = createQuestionnaire(questionnaire.definition).getPages(answers, draft?.extraModules ?? []);
  const included = new Set<string>();
  const parts = [
    `# Onboarding — ${heading(summary.businessName || summary.contactName || user?.name || "Client")}`,
    `**Contact:** ${heading(summary.contactName || user?.name || "Not provided")}  \n**Email:** ${heading(summary.contactEmail || user?.email || "Not provided")}`,
    `**Questionnaire:** ${heading(questionnaire.title)}  \n**Version:** ${heading(questionnaire.version)}  \n**Status:** ${draft ? draft.status === "submitted" ? "Submitted" : "Draft" : "Not started"}`,
  ];
  if (draft) {
    parts.push(`**Last saved:** ${new Date(draft.updatedAt).toISOString()}${draft.submittedAt === null ? "" : `  \n**Submitted:** ${new Date(draft.submittedAt).toISOString()}`}  \n**Privacy notice version:** ${heading(draft.privacyVersion)}`);
  } else {
    parts.push("This client has not saved any onboarding answers yet.");
  }
  function addPage(page: typeof pages[number], questions: Question[]) {
    parts.push(`## ${heading(page.id)} — ${heading(page.title)}`);
    if (page.description) parts.push(quote(page.description));
    for (const question of questions) {
      if (included.has(question.id)) continue;
      included.add(question.id);
      parts.push(questionMarkdown(question, answers[question.id]));
    }
  }
  for (const page of pages) addPage(page, page.questions);

  const inactive = questionnaire.definition.pages.map(page => ({ page, questions: page.questions.filter(question => answers[question.id] && !included.has(question.id)) }))
    .filter(item => item.questions.length);
  if (inactive.length) {
    parts.push("## Saved answers outside the current route", "These responses are preserved from questions or workflows that are currently hidden.");
    for (const { page, questions } of inactive) addPage(page, questions);
  }
  const unmapped = Object.keys(answers).filter(id => !included.has(id));
  if (unmapped.length) {
    parts.push("## Other saved answers", "Original question wording is unavailable for these saved question IDs.");
    for (const id of unmapped) {
      included.add(id);
      parts.push(questionMarkdown({ id, label: "Original question unavailable", type: "text", required: false }, answers[id]));
    }
  }
  // Active responses take precedence if a removed question has since returned.
  const removed = retained.filter(row => !included.has(row.questionId) && !answers[row.questionId]);
  if (removed.length) {
    parts.push("## Saved answers from earlier questionnaires");
    for (const row of removed) {
      if (included.has(row.questionId)) continue;
      included.add(row.questionId);
      parts.push(`**Original topic:** ${heading(row.pageTitle ?? "Unavailable")}  \n**Original version:** ${heading(row.version)}`);
      parts.push(questionMarkdown(row.question ?? { id: row.questionId, label: "Original question unavailable", type: "text", required: false }, row.answer));
    }
  }
  return `${parts.join("\n\n")}\n`;
}
