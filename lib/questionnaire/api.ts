import type { QuestionnaireDefinition } from "./types";
export type EditorData = {
  scope: string; assignedVersion: string; baseVersion: string; title: string;
  definition: QuestionnaireDefinition; revision: number; hasDraft: boolean;
  versions: { version: string; title: string; createdAt: number; createdBy: string; note: string }[];
};
export type PortalClient = { authUserId: string; name: string; email: string; businessName: string; version: string; status: string; customized: boolean };
export type ClientPage = { page: PortalClient[]; isDone: boolean; continueCursor: string };
export type HistoryRow = { version: string; archivedAt: number; actor: string; reason: string; status: string; answeredCount: number };
export async function questionnaireRequest<T>(operation: string, data: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/questionnaires", { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, operation }) });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The questionnaire request failed.");
  return result as T;
}
