import type { QuestionnaireDefinition, Question } from "./types";
import { SYSTEM_QUESTIONS } from "./definition-validation";
const idPart = () => crypto.randomUUID().slice(0, 8);
export function replaceQuestion(definition: QuestionnaireDefinition, question: Question): QuestionnaireDefinition {
  return { ...definition, pages: definition.pages.map(page => ({ ...page, questions: page.questions.map(current => current.id === question.id ? question : current) })) };
}
export function removeQuestion(definition: QuestionnaireDefinition, id: string): QuestionnaireDefinition {
  if (SYSTEM_QUESTIONS[id]) throw new Error("Identity and final confirmation fields cannot be removed.");
  return { ...definition, pages: definition.pages.map(page => ({ ...page, questions: page.questions.filter(question => question.id !== id) })).filter(page => page.questions.length), phases: definition.phases.map(phase => ({ ...phase, questionIds: phase.questionIds.filter(current => current !== id) })).filter(phase => phase.questionIds.length) };
}
export function addQuestion(definition: QuestionnaireDefinition, pageId: string, afterId: string) {
  const page = definition.pages.find(page => page.id === pageId);
  if (!page) throw new Error("Choose a topic first.");
  if (definition.layout === "compact") {
    const question: Question = { id: `${page.id}.q-${idPart()}`, label: "What else would you like us to know?", type: "textarea", required: false, optionalDetail: true, help: "Optional: share one example or useful link. You can leave this blank." };
    const index = page.questions.findIndex(question => question.id === afterId) + 1;
    return { definition: { ...definition, pages: definition.pages.map(current => current.id === pageId ? { ...current, questions: [...current.questions.slice(0, index), question, ...current.questions.slice(index)] } : current) }, questionId: question.id };
  }
  const phase = definition.phases.find(phase => phase.questionIds.includes(afterId));
  if (page.kind !== "module" && (!phase || phase.questionIds.length >= 5 || afterId === "P16.3")) throw new Error("This phase is full or ends with confirmation. Add a new business phase instead.");
  const question: Question = { id: `${page.id}.q-${idPart()}`, label: "What else should we understand?", type: "textarea", required: false, help: "A short example is enough.", why: "This helps us plan the work for your project." };
  const index = page.questions.findIndex(question => question.id === afterId) + 1;
  const result = { ...definition, pages: definition.pages.map(current => current.id === page.id ? { ...current, questions: [...current.questions.slice(0, index), question, ...current.questions.slice(index)] } : current), phases: definition.phases.map(current => current.id === phase?.id ? { ...current, questionIds: [...current.questionIds.slice(0, current.questionIds.indexOf(afterId) + 1), question.id, ...current.questionIds.slice(current.questionIds.indexOf(afterId) + 1)] } : current) };
  return { definition: result, questionId: question.id };
}
export function addTopic(definition: QuestionnaireDefinition, kind: "shared" | "module") {
  const suffix = idPart(); const id = `${kind === "module" ? "M" : "P"}custom-${suffix}`;
  const question: Question = { id: `${id}.1`, label: "What should we know about this part of your business?", type: "textarea", required: false, help: "Start with one example.", why: "This gives us context for planning your project." };
  const title = kind === "module" ? "New workflow" : "Additional business context";
  const page = { id, title, kind, description: "Share what you know; you can ask for help.", questions: [question] };
  if (definition.layout === "compact") {
    question.optionalDetail = true;
    question.help = "Optional: share one example or useful link. You can leave this blank.";
    return { definition: { ...definition, pages: [...definition.pages, page] }, questionId: question.id };
  }
  const firstModule = definition.pages.findIndex(page => page.kind === "module");
  const firstClosing = definition.phases.findIndex(phase => phase.placement === "after-modules");
  const closingQuestion = definition.phases[firstClosing]?.questionIds[0];
  const closingPage = definition.pages.findIndex(page => page.questions.some(question => question.id === closingQuestion));
  const insertAt = kind === "module" ? (closingPage < 0 ? definition.pages.length : closingPage) : firstModule >= 0 ? firstModule : closingPage < 0 ? definition.pages.length : closingPage;
  const pages = [...definition.pages.slice(0, insertAt), page, ...definition.pages.slice(insertAt)];
  const phases = kind === "module" ? definition.phases : [...definition.phases.slice(0, firstClosing), { id: `phase-${suffix}`, title, questionIds: [question.id], placement: "before-modules" as const }, ...definition.phases.slice(firstClosing)];
  return { definition: { ...definition, pages, phases }, questionId: question.id };
}
