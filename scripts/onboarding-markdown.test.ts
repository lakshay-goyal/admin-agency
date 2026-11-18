import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ClientDetail } from "../lib/admin/types";
import type { Answers, Question, QuestionnaireDefinition } from "../lib/onboarding/types";
import { buildOnboardingMarkdown, type RetainedOnboardingAnswer } from "../lib/admin/onboarding-markdown";

const question = (id: string, extra: Partial<Question> = {}): Question => ({ id, label: `Question ${id}?`, type: "text", required: false, ...extra });
const questions = [
  question("name", { help: "Share the full name", why: "So we can address you", placeholder: "Acme" }),
  question("choices", { type: "multi-select", options: ["web", "app"], optionLabels: { web: "Website", app: "Mobile app" }, optionDescriptions: { web: "Your public website" } }),
  question("budget", { type: "budget", fields: [{ id: "amount", label: "Amount" }, { id: "currency", label: "Currency" }] }),
  question("assets", { type: "assets", options: ["logo"], optionLabels: { logo: "Brand logo" } }),
  question("zero", { type: "range" }),
  question("false", { type: "checkbox" }),
  question("true", { type: "checkbox" }),
  question("missing"), question("unknown"), question("deferred"), question("help"), question("na"),
  question("hidden", { condition: { questionId: "name", includes: ["Other client"] } }),
  question("hidden-missing", { condition: { questionId: "name", includes: ["Other client"] } }),
  question("P15.2", { type: "list", fields: [{ id: "name", label: "Full name" }, { id: "email", label: "Email address" }] }),
];
const definition: QuestionnaireDefinition = {
  pages: [
    { id: "P01", title: "Business details", description: "Tell us about the business", questions },
    { id: "M01", title: "Previous workflow", kind: "module", questions: [question("inactive"), question("inactive-missing")] },
    { id: "M02", title: "Extra workflow", kind: "module", questions: [question("extra")] },
  ], phases: [], rules: [],
};
const answers: Answers = {
  name: { state: "answered", value: "Acme *Studio*\n# Heading\n\n<script>alert('x')</script>" },
  choices: { state: "answered", value: ["web", "app"], priority: "web", detail: "Line one\nLine two" },
  budget: { state: "answered", value: { amount: "0", extra: "Keep this too" } },
  assets: { state: "answered", value: { logo: "needs-help" } },
  zero: { state: "answered", value: 0 },
  false: { state: "answered", value: false }, true: { state: "answered", value: true },
  unknown: { state: "unknown", value: "Earlier value", detail: "Ask on the call" },
  deferred: { state: "deferred", value: "", detail: "Next week" },
  help: { state: "help", value: "", priority: "First", detail: "Please explain" },
  na: { state: "not-applicable", value: "" },
  hidden: { state: "answered", value: "Hidden response" },
  inactive: { state: "answered", value: "Old workflow response" },
  extra: { state: "answered", value: "Extra response" },
  orphan: { state: "answered", value: "Unmapped response" },
  "P15.2": { state: "answered", value: { name: "Person One", email: "one@example.test", name2: "Person Two", email2: "two@example.test" } },
};

function fixture(): ClientDetail {
  return {
    questionnaire: { title: "Assigned client questionnaire", version: "client-v1", customized: true, definition },
    draft: { version: "client-v1", answers, extraModules: ["M02"], currentPage: "P01", currentQuestion: null, status: "submitted", updatedAt: 1700000000000, submittedAt: 1700000000000, privacyVersion: "privacy-v1" },
    summary: { businessName: "Acme", contactName: "Client Name", contactEmail: "client@example.test" },
    user: null,
  } as ClientDetail;
}

describe("complete onboarding Markdown", () => {
  test("exports all visible questions and every saved response, including hidden, inactive, extra, and unmapped IDs", () => {
    const md = buildOnboardingMarkdown(fixture());
    for (const id of Object.keys(answers)) assert.equal(md.split(`### ${id} —`).length, 2);
    assert.ok(md.includes("### missing —"));
    assert.ok(!md.includes("### hidden-missing —"));
    assert.ok(!md.includes("### inactive-missing —"));
    assert.ok(md.includes("Saved answers outside the current route"));
    assert.ok(md.includes("Assigned client questionnaire"));
    assert.ok(md.includes("**Version:** client-v1"));
    assert.ok(md.includes("**Status:** Submitted"));
    assert.ok(md.includes("Tell us about the business"));
  });

  test("preserves complete prompts, readable choice labels, structured fields, status, priority and notes", () => {
    const md = buildOnboardingMarkdown(fixture());
    for (const text of ["Share the full name", "So we can address you", "Acme", "Website — Your public website", "Mobile app", "Amount: 0", "Currency: Not answered", "extra: Keep this too", "Brand logo: Needs help", "Email address (member 2): two@example.test", "**First priority:**\n\n> Website", "Line one  \n> Line two", "Not sure yet", "Provide later", "Needs discussion", "Not applicable", "Earlier value", "Ask on the call", "Not confirmed", "Confirmed", "> 0"]) assert.ok(md.includes(text));
  });

  test("keeps multiline answers as literal Markdown content", () => {
    const md = buildOnboardingMarkdown(fixture());
    assert.ok(md.includes("> Acme \\*Studio\\*  \n> \\# Heading  \n>   \n> \\<script\\>alert('x')\\</script\\>"));
  });

  test("includes removed questions with original wording while preferring current answers for restored questions", () => {
    const row: RetainedOnboardingAnswer = { questionId: "removed", question: question("removed", { label: "Original removed question?" }), pageTitle: "Old topic", version: "old-v1", answer: { state: "answered", value: "Retained response", detail: "Retained note" } };
    const md = buildOnboardingMarkdown(fixture(), [row, { ...row, questionId: "name", question: question("name"), answer: { state: "answered", value: "Outdated name" } }, { ...row, questionId: "unavailable", question: null, pageTitle: null }]);
    for (const text of ["Original removed question?", "Retained response", "Retained note", "Old topic", "old-v1", "### unavailable — Original question unavailable"]) assert.ok(md.includes(text));
    assert.ok(!md.includes("Outdated name"));
    assert.equal(md.split("### name —").length, 2);
  });

  test("exports unanswered prompts honestly for a client who has not started", () => {
    const client = fixture();
    client.draft = null;
    const md = buildOnboardingMarkdown(client);
    assert.ok(md.includes("**Status:** Not started"));
    assert.ok(md.includes("has not saved any onboarding answers"));
    assert.ok(md.includes("**Status:** Not answered"));
    assert.ok(!md.includes("undefined"));
  });
});
