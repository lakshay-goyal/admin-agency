import { ANSWER_STATE_LABELS, answerValues, createQuestionnaire, getAllowedAnswerStates, getOptionLabel, isAnswerEmpty, isQuestionVisible } from "@/lib/onboarding/engine";
import { getOnboardingPhases } from "@/lib/onboarding/phase-engine";
import type {
  Answer,
  AnswerState,
  Answers,
  QuestionnaireDefinition,
  Question,
} from "@/lib/onboarding/types";

export { ANSWER_STATE_LABELS };

export const DISPLAY_STATE_LABELS: Record<AnswerState, string> = {
  answered: "Answered",
  unknown: "Not sure yet",
  "not-applicable": "Not applicable",
  deferred: "Provide later",
  help: "Needs discussion",
};

export function answerStateLabel(state: AnswerState) {
  return DISPLAY_STATE_LABELS[state];
}

const ASSET_STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  "needs-updating": "Needs updating",
  "needs-help": "Needs help",
  "not-available": "Not available",
};

export function formatQuestionAnswer(
  question: Question,
  answer: Answer | undefined,
) {
  if (!answer) return "Not answered";
  if (answer.state !== "answered") {
    return [DISPLAY_STATE_LABELS[answer.state], answer.detail]
      .filter(Boolean)
      .join(" — ");
  }
  const value = answer.value;
  let result: string;
  if (Array.isArray(value)) {
    result = value.filter(Boolean).map(item => getOptionLabel(question, item)).join(", ");
  } else if (typeof value === "boolean") {
    result = value ? "Confirmed" : "Not confirmed";
  } else if (typeof value === "number") {
    result = String(value);
  } else if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item.trim());
    if (question.type === "assets") {
      result = entries
        .map(
          ([label, status]) =>
            `${getOptionLabel(question, label)} — ${ASSET_STATUS_LABELS[status] ?? status}`,
        )
        .join(" · ");
    } else if (question.fields?.length) {
      const labels = new Map(
        question.fields.map((field) => [field.id, field.label]),
      );
      result = entries
        .map(([key, item]) => `${labels.get(key) ?? key}: ${item}`)
        .join(" · ");
    } else {
      result = entries.map(([key, item]) => `${key}: ${item}`).join(" · ");
    }
  } else {
    result = getOptionLabel(question, value);
  }
  return [
    result || "No value recorded",
    answer.priority ? `First priority: ${answer.priority}` : "",
    answer.detail,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function getClientPhases(definition: QuestionnaireDefinition, answers: Answers, extras: string[]) {
  return getOnboardingPhases(definition, answers, extras, true)
    .map((phase) => ({
      ...phase,
      questions: phase.steps
        .filter((step) => step.question)
        .filter((step) => isQuestionVisible(step.question!, answers))
        .map((step) => ({
          question: step.question!,
          page: step.page,
          answer: answers[step.question!.id],
          complete:
            Boolean(answers[step.question!.id]) &&
            !isAnswerEmpty(answers[step.question!.id]),
        })),
    }))
    .filter((phase) => phase.questions.length > 0);
}

/** Saved answers whose workflow is no longer in the client's active route. */
export function getInactiveAnsweredPages(definition: QuestionnaireDefinition, answers: Answers, extras: string[]) {
  const active = new Set(createQuestionnaire(definition).getPages(answers, extras).map((page) => page.id));
  return definition.pages.filter((page) => !active.has(page.id))
    .map((page) => ({
      ...page,
      questions: page.questions.filter((question) => answers[question.id]),
    }))
    .filter((page) => page.questions.length > 0);
}

export function getOpenItemIds(definition: QuestionnaireDefinition, answers: Answers, extras: string[]) {
  return new Set(
    createQuestionnaire(definition).getOpenItems(answers, extras).map((item) => item.questionId),
  );
}

export function getSelectedWork(answers: Answers) {
  return answerValues(answers["P08.1"]);
}

export function getModulePages(definition: QuestionnaireDefinition) {
  return definition.pages.filter(page => page.kind === "module");
}

export function moduleTitle(definition: QuestionnaireDefinition, id: string) {
  return definition.pages.find(page => page.id === id)?.title ?? id;
}

export function defaultValueForQuestion(question: Question): Answer["value"] {
  if (question.type === "checkbox") return false;
  if (question.type === "range") return question.minimum ?? 0;
  if (question.type === "multi-select") return [];
  if (question.type === "assets") {
    if (question.options?.length) return {};
    return [];
  }
  if (
    question.fields?.length ||
    question.type === "country-timezone" ||
    question.type === "two-lists" ||
    question.type === "budget"
  ) {
    return Object.fromEntries(
      (question.fields ?? []).map((field) => [field.id, ""]),
    );
  }
  return "";
}

export function getAllowedStates(question: Question): AnswerState[] {
  return ["answered", ...new Set(getAllowedAnswerStates(question))];
}
