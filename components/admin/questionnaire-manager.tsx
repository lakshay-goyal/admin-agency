"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, RefreshCwIcon, SaveIcon, UploadIcon, SearchIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FieldGroup, FieldSet, FieldLegend } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { questionnaireRequest, type EditorData, type PortalClient, type ClientPage, type HistoryRow } from "@/lib/questionnaire/api";
import { validateDefinition } from "@/lib/questionnaire/definition-validation";
import { addQuestion, addTopic, removeQuestion, replaceQuestion } from "@/lib/questionnaire/editor-model";
import type { QuestionnaireDefinition } from "@/lib/questionnaire/types";
import { QuestionnaireQuestionEditor, EditorField } from "./questionnaire-question-editor";
import { QuestionnaireClientRollout } from "./questionnaire-client-rollout";
import { QuestionnaireRoutingEditor } from "./questionnaire-routing-editor";

export function QuestionnaireManager() {
  const [target, setTarget] = useState("");
  const [editor, setEditor] = useState<EditorData | null>(null);
  const [selected, setSelected] = useState("");
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [clientError, setClientError] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState<"publish" | "discard" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState("questions");
  const targetData = target ? { targetUserId: target } : {};
  useEffect(() => {
    const controller = new AbortController();
    void questionnaireRequest<ClientPage>("clients", {}, controller.signal).then(result => { setClients(result.page); setCursor(result.isDone ? undefined : result.continueCursor); }).catch(cause => { if (!controller.signal.aborted) setClientError(cause.message); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    void questionnaireRequest<EditorData>("load", target ? { targetUserId: target } : {}, controller.signal).then(result => {
      setEditor(result); setSelected(result.definition.pages[0].questions[0].id); setDirty(false); setLoading(false);
    }).catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false); } });
    if (target) void questionnaireRequest<HistoryRow[]>("history", { targetUserId: target }, controller.signal).then(setHistory).catch(() => {});
    return () => controller.abort();
  }, [target, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function changeScope(value: string) {
    if (dirty) { setError("Save or discard your changes before switching questionnaires."); return; }
    setLoading(true); setEditor(null); setError(""); setNotice(""); setHistory([]); setTarget(value);
  }
  function changeDefinition(definition: QuestionnaireDefinition) {
    if (!editor) return;
    setEditor({ ...editor, definition }); setDirty(true); setError(""); setNotice("");
  }
  const page = editor?.definition.pages.find(page => page.questions.some(question => question.id === selected)) ?? editor?.definition.pages[0];
  const question = page?.questions.find(question => question.id === selected) ?? page?.questions[0];
  const validation = editor ? validateDefinition(editor.definition) : [];
  function exportSnapshot() {
    if (!editor) return;
    const content = { source: "Backend questionnaire editor", version: editor.assignedVersion, title: editor.title, draft: dirty || editor.hasDraft, revision: editor.revision, definition: editor.definition };
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "onboarding-questionnaire.json"; link.click(); URL.revokeObjectURL(url);
  }
  async function save() {
    if (!editor || busy) return;
    if (validation.length) { setError(validation.slice(0, 8).join("\n")); return; }
    setBusy(true); setError("");
    try {
      const result = await questionnaireRequest<{ revision: number }>("save", { ...targetData, title: editor.title, definition: editor.definition, expectedRevision: editor.revision, baseVersion: editor.baseVersion });
      setEditor({ ...editor, revision: result.revision, hasDraft: true }); setDirty(false); setNotice("Draft saved. Clients still see their published questionnaire.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save."); } finally { setBusy(false); }
  }
  async function publish() {
    if (!editor || busy || dirty) return;
    setBusy(true); setError("");
    try {
      await questionnaireRequest("publish", { ...targetData, expectedRevision: editor.revision, reason });
      setDialog(null); setReason(""); setNotice(target ? "Published for this client only. Previous answers are preserved in history." : "Published for new clients. Existing questionnaires and submissions are unchanged."); setLoading(true); setReload(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to publish."); } finally { setBusy(false); }
  }
  async function discard() {
    if (!editor) return;
    setBusy(true); setError("");
    try {
      if (editor.hasDraft) await questionnaireRequest("discard", { ...targetData, expectedRevision: editor.revision });
      setDirty(false); setDialog(null); setLoading(true); setReload(value => value + 1); setNotice("Draft discarded. The published questionnaire is unchanged.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to discard."); } finally { setBusy(false); }
  }
  function add(kind?: "shared" | "module") {
    if (!editor || !page || !question) return;
    try {
      const result = kind ? addTopic(editor.definition, kind) : addQuestion(editor.definition, page.id, question.id);
      changeDefinition(result.definition); setSelected(result.questionId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add question."); }
  }
  return <div className="min-h-svh bg-muted/20"><header className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><div><Link href="/dashboard" onClick={event => { if (dirty) { event.preventDefault(); setError("Save or discard changes before leaving the editor."); } }} className="mb-2 inline-flex min-h-8 items-center gap-2 text-sm text-muted-foreground"><ArrowLeftIcon size={15} aria-hidden="true" />Client workspace</Link><h1 className="text-2xl font-semibold tracking-tight">Onboarding questionnaires</h1><p className="mt-1 text-sm text-muted-foreground">Publish a better starting point or tailor the brief for one client.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || loading || !editor} onClick={exportSnapshot}><DownloadIcon data-icon="inline-start" />Export JSON</Button><Button type="button" variant="outline" disabled={busy || loading} onClick={() => { if (dirty) { setError("Save or discard changes before reloading."); return; } setLoading(true); setReload(value => value + 1); }}><RefreshCwIcon data-icon="inline-start" />Reload</Button><Button type="button" variant="outline" disabled={busy || loading || (!dirty && !editor?.hasDraft)} onClick={() => setDialog("discard")}>Discard draft</Button><Button type="button" variant="outline" disabled={busy || loading || !editor || !dirty} onClick={() => void save()}><SaveIcon data-icon="inline-start" />{busy ? "Working…" : "Save draft"}</Button><Button type="button" disabled={busy || loading || !editor?.hasDraft || dirty || validation.length > 0} onClick={() => setDialog("publish")}><UploadIcon data-icon="inline-start" />Publish</Button></div></div></header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><FieldSet disabled={busy} className="min-w-0 gap-6"><FieldLegend className="sr-only">Questionnaire editor</FieldLegend>
      <section className="rounded-xl border bg-background p-5"><FieldGroup><EditorField label="Who should receive these changes?"><select aria-label="Questionnaire scope" className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" value={target} disabled={busy} onChange={event => changeScope(event.target.value)}><option value="">New clients · published starting questionnaire</option>{clients.map(client => <option key={client.authUserId} value={client.authUserId}>{client.businessName || client.name || client.email} · {client.status}{client.customized ? " · customized" : ""}</option>)}</select></EditorField></FieldGroup><p className="mt-3 text-sm text-muted-foreground">{target ? `Only ${clients.find(client => client.authUserId === target)?.name || "this client"} will receive this release. Saved answers remain prefilled; new questions need review and prior responses stay in history.` : "Global releases apply when a new client first opens onboarding. Existing clients keep their assigned version, even while a brief is in progress."}</p>{cursor && <Button className="mt-3" type="button" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const result = await questionnaireRequest<ClientPage>("clients", { cursor }); setClients(previous => [...previous, ...result.page.filter(client => !previous.some(row => row.authUserId === client.authUserId))]); setCursor(result.isDone ? undefined : result.continueCursor); } catch (cause) { setClientError(cause instanceof Error ? cause.message : "Could not load clients."); } finally { setBusy(false); } }}>Load more portal clients</Button>}{clientError && <p className="mt-3 text-sm text-destructive" role="alert">{clientError}</p>}{!target && editor && <QuestionnaireClientRollout key={editor.assignedVersion} version={editor.assignedVersion} disabled={busy || loading || dirty || editor.hasDraft} onApplied={() => { setLoading(true); setReload(value => value + 1); }} />}</section>
      {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not complete this change</AlertTitle><AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription></Alert>}
      {notice && <Alert role="status"><AlertTitle>Questionnaire update</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
      {loading ? <p role="status" className="py-12 text-center text-muted-foreground">Loading the saved questionnaire…</p> : editor && <>
        <section className="flex flex-col gap-4 rounded-xl border bg-background p-5"><FieldGroup><EditorField label="Questionnaire title"><Input aria-label="Questionnaire title" value={editor.title} onChange={event => { setEditor({ ...editor, title: event.target.value }); setDirty(true); }} /></EditorField></FieldGroup><div className="flex flex-wrap gap-2"><Badge variant="outline">{editor.definition.pages.reduce((count, page) => count + page.questions.length, 0)} questions in library</Badge><Badge variant="outline">{dirty ? "Unsaved changes" : editor.hasDraft ? `Saved draft · revision ${editor.revision}` : "Published version"}</Badge></div><p className="break-all text-xs text-muted-foreground">Assigned version: {editor.assignedVersion}</p></section>
        <Tabs value={tab} onValueChange={value => setTab(String(value))}><TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="questions">Questions</TabsTrigger><TabsTrigger value="routing">Routing & phases</TabsTrigger><TabsTrigger value="releases">Release history</TabsTrigger></TabsList>
          <TabsContent value="questions" className="mt-5"><div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="flex min-w-0 flex-col gap-4 rounded-xl border bg-background p-4 lg:sticky lg:top-4 lg:max-h-[85svh] lg:self-start"><div className="relative"><SearchIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Find a question" className="pl-9" placeholder="Find a question…" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => add("shared")}><PlusIcon data-icon="inline-start" />Business phase</Button><Button type="button" variant="outline" size="sm" onClick={() => add("module")}><PlusIcon data-icon="inline-start" />Workflow</Button></div><nav aria-label="Question library" className="flex flex-col gap-3 overflow-auto">{editor.definition.pages.map(topic => { const matches = topic.questions.filter(question => `${question.id} ${question.label} ${topic.title}`.toLowerCase().includes(query.toLowerCase())); if (!matches.length) return null; return <div key={topic.id}><p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{topic.id} · {topic.title}</p>{matches.map(item => <button key={item.id} type="button" aria-current={question?.id === item.id ? "true" : undefined} className={`min-h-11 w-full rounded-lg px-2 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring ${question?.id === item.id ? "bg-muted font-medium" : "hover:bg-muted/60"}`} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>; })}</nav></aside>
          <section className="min-w-0 rounded-xl border bg-background p-5 sm:p-7">{page && question && <><FieldGroup className="mb-6"><EditorField label="Topic title"><Input aria-label="Topic title" value={page.title} onChange={event => changeDefinition({ ...editor.definition, pages: editor.definition.pages.map(current => current.id === page.id ? { ...current, title: event.target.value } : current) })} /></EditorField><EditorField label="Topic introduction"><Textarea aria-label="Topic introduction" rows={2} value={page.description ?? ""} onChange={event => changeDefinition({ ...editor.definition, pages: editor.definition.pages.map(current => current.id === page.id ? { ...current, description: event.target.value } : current) })} /></EditorField></FieldGroup><QuestionnaireQuestionEditor key={`${target}:${reload}:${question.id}`} question={question} definition={editor.definition} onChange={next => changeDefinition(replaceQuestion(editor.definition, next))} onDelete={() => setDialog("delete")} onAdd={() => add()} /></>}</section></div></TabsContent>
          <TabsContent value="routing" className="mt-5 rounded-xl border bg-background p-5 sm:p-7"><QuestionnaireRoutingEditor definition={editor.definition} onChange={changeDefinition} /></TabsContent>
          <TabsContent value="releases" className="mt-5 flex flex-col gap-4">{target && <section className="rounded-xl border bg-background p-5"><h2 className="font-semibold">Previous client responses</h2><p className="mt-1 text-sm text-muted-foreground">Client-specific publishing archives the previous response set while keeping saved answers prefilled.</p>{history.length ? history.map(row => <div className="mt-4 border-t pt-4 text-sm" key={`${row.version}:${row.archivedAt}`}><p>{row.reason}</p><p className="mt-1 text-muted-foreground">{new Date(row.archivedAt).toLocaleString()} · {row.status} · {row.answeredCount} saved answers</p><p className="mt-1 break-all text-xs text-muted-foreground">{row.version}</p></div>) : <p className="mt-3 text-sm text-muted-foreground">No client-specific response archive yet.</p>}</section>}<section className="rounded-xl border bg-background p-5"><h2 className="font-semibold">Published starting questionnaires</h2>{editor.versions.map(version => <div key={version.version} className="mt-4 border-t pt-4"><h3 className="font-medium">{version.title}</h3><p className="mt-1 text-sm text-muted-foreground">{version.note}</p><p className="mt-2 break-all text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()} · {version.version}</p></div>)}</section></TabsContent>
        </Tabs>
      </>}
    </FieldSet></main>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open && !busy) setDialog(null); }}><DialogContent className="max-h-[90svh] overflow-y-auto" showCloseButton={!busy}><DialogHeader><DialogTitle>{dialog === "publish" ? target ? "Publish for this client?" : "Publish for new clients?" : dialog === "delete" ? "Remove this question from the draft?" : "Discard this draft?"}</DialogTitle><DialogDescription>{dialog === "publish" ? target ? "Only this client receives these changes. Their old responses are archived; saved answers remain prefilled and the brief returns to draft for review." : "New clients receive this version. Existing assignments, answers, and submitted briefs stay unchanged." : dialog === "delete" ? "This changes only the editor draft until you publish. Repair any routing rules or conditions that refer to the removed question before saving." : "Your editor changes will be removed. Published versions and client answers remain available."}</DialogDescription></DialogHeader>{dialog === "publish" && <EditorField label="Reason for this release"><Textarea aria-label="Reason for publishing" disabled={busy} value={reason} maxLength={1000} rows={3} onChange={event => setReason(event.target.value)} /></EditorField>}{error && <p className="whitespace-pre-wrap text-sm text-destructive" role="alert">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button type="button" disabled={busy || dialog === "publish" && !reason.trim()} onClick={() => { if (dialog === "publish") void publish(); else if (dialog === "discard") void discard(); else if (editor && question) { try { const next = removeQuestion(editor.definition, question.id); changeDefinition(next); setSelected(next.pages[0].questions[0].id); setDialog(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove question."); } } }}>{busy ? "Working…" : dialog === "publish" ? "Publish version" : dialog === "delete" ? "Remove question" : "Discard draft"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
