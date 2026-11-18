"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { questionnaireRequest, type ClientPage, type PortalClient } from "@/lib/questionnaire/api";

export function QuestionnaireClientRollout({ version, disabled, onApplied }: { version: string; disabled: boolean; onApplied: () => void }) {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function show() {
    setBusy(true); setError(""); setNotice("");
    try {
      const rows: PortalClient[] = [];
      let cursor: string | undefined;
      do {
        const result = await questionnaireRequest<ClientPage>("clients", cursor ? { cursor } : {});
        rows.push(...result.page);
        cursor = result.isDone ? undefined : result.continueCursor;
      } while (cursor);
      setClients(rows); setSelected([]); setReason(""); setQuery(""); setOpen(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load clients."); }
    finally { setBusy(false); }
  }

  async function apply() {
    const targets = clients.filter(client => selected.includes(client.authUserId));
    if (!targets.length || !reason.trim() || busy) return;
    setBusy(true); setError("");
    let completed = 0;
    try {
      // Keep database work bounded. Each batch is atomic and retries are idempotent.
      for (let offset = 0; offset < targets.length; offset += 10) {
        const batch = targets.slice(offset, offset + 10);
        await questionnaireRequest("apply", { version, reason, clients: batch.map(client => ({ authUserId: client.authUserId, expectedVersion: client.version })) });
        completed += batch.length;
        const ids = new Set(batch.map(client => client.authUserId));
        setSelected(previous => previous.filter(id => !ids.has(id)));
        setClients(previous => previous.map(client => ids.has(client.authUserId) ? { ...client, version } : client));
        setNotice(`Applied to ${completed} of ${targets.length} selected clients.`);
      }
      setOpen(false); onApplied();
    } catch (cause) {
      setError(`${completed} of ${targets.length} clients updated. Remaining clients are still selected. ${cause instanceof Error ? cause.message : "Could not apply this release."}`);
    } finally { setBusy(false); }
  }

  const eligible = clients.filter(client => client.version !== version);
  const shown = eligible.filter(client => `${client.businessName} ${client.name} ${client.email}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mt-4 flex flex-col items-start gap-2">
    <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void show()}>{busy ? "Working…" : "Apply published version to existing clients"}</Button>
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {!open && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto" showCloseButton={!busy}>
        <DialogHeader><DialogTitle>Update selected client questionnaires</DialogTitle><DialogDescription>These clients will receive the published global format, replacing any private customization. Saved answers with the same question IDs stay prefilled. Previous responses are archived; clients review new questions and confirm their brief again. Unselected clients keep their current version.</DialogDescription></DialogHeader>
        <Popover><PopoverTrigger render={<Button type="button" variant="outline" disabled={busy} className="justify-between" />}>{selected.length ? `${selected.length} clients selected` : "Select clients"}<ChevronDownIcon aria-hidden="true" /></PopoverTrigger>
          <PopoverContent className="w-[min(26rem,calc(100vw-3rem))]" align="start">
            <Input aria-label="Search rollout clients" placeholder="Search clients…" value={query} disabled={busy} onChange={event => setQuery(event.target.value)} />
            <label className="flex min-h-11 items-center gap-3 border-b px-2 text-sm font-medium"><Checkbox disabled={busy || !eligible.length} checked={eligible.length > 0 && selected.length === eligible.length} indeterminate={selected.length > 0 && selected.length < eligible.length} onCheckedChange={checked => setSelected(checked ? eligible.map(client => client.authUserId) : [])} />Select all {eligible.length} eligible clients</label>
            <div className="max-h-64 overflow-auto">{shown.map(client => <label key={client.authUserId} className="flex min-h-11 items-start gap-3 rounded-md p-2 hover:bg-muted"><Checkbox className="mt-1" disabled={busy} checked={selected.includes(client.authUserId)} onCheckedChange={checked => setSelected(previous => checked ? [...previous, client.authUserId] : previous.filter(id => id !== client.authUserId))} /><span className="min-w-0 text-sm"><span className="block font-medium">{client.businessName || client.name}</span><span className="block break-all text-xs text-muted-foreground">{client.email} · {client.status}{client.customized ? " · private questionnaire" : ""}</span></span></label>)}{!shown.length && <p className="p-3 text-sm text-muted-foreground">No eligible clients match.</p>}</div>
          </PopoverContent>
        </Popover>
        <label className="flex flex-col gap-2 text-sm font-medium">Reason for updating these clients<Textarea disabled={busy} value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} rows={3} /></label>
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="button" disabled={busy || !selected.length || !reason.trim()} onClick={() => void apply()}>{busy ? "Applying…" : `Update ${selected.length} clients`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
