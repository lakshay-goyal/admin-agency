"use client";

import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import type { ClientRow } from "@/lib/admin/types";
import { initials, relativeTime } from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import { SignOutButton } from "@/components/sign-out-button";
import { MiniProgress } from "@/components/admin/admin-ui";

export type ClientFilter =
  | "all"
  | "attention"
  | "draft"
  | "active"
  | "complete";

export const CLIENT_FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Attention" },
  { value: "draft", label: "Drafts" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Done" },
];

export function ClientSidebar({
  admin,
  clients,
  totalCount,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
}: {
  admin: { name: string; email: string };
  clients: ClientRow[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  filter: ClientFilter;
  onFilterChange: (filter: ClientFilter) => void;
  counts: Record<ClientFilter, number>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <UsersIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Agency Desk</p>
          <p className="truncate text-xs text-muted-foreground">
            Client workspace
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {totalCount}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 px-3 pt-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search clients…"
            className="bg-background pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {CLIENT_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                filter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-pressed={filter === option.value}
            >
              {option.label}
              {counts[option.value] ? (
                <span className="ml-1 opacity-70">{counts[option.value]}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="mt-2 min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-2">
          {clients.length ? (
            clients.map((client) => (
              <ClientItem
                key={client.authUserId}
                client={client}
                selected={client.authUserId === selectedId}
                onSelect={() => onSelect(client.authUserId)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <SearchIcon className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">
                {totalCount ? "No matching clients" : "No client records yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalCount
                  ? "Try a different search or filter."
                  : "Client briefs appear here once the admin app is connected to the client Convex deployment."}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="mt-auto flex items-center gap-2.5 border-t px-3 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {initials(admin.name || admin.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{admin.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {admin.email}
          </p>
        </div>
        <SignOutButton compact />
      </div>
    </div>
  );
}

function ClientItem({
  client,
  selected,
  onSelect,
}: {
  client: ClientRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-xl border border-transparent p-2.5 text-left transition-colors",
        selected
          ? "border-border bg-background shadow-sm"
          : "hover:bg-muted/70",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <div className="flex items-start gap-2">
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
          {initials(client.businessName || client.contactName || client.email)}
          {client.needsAttention ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{client.businessName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {client.contactName || client.contactEmail || client.email || "No contact"}
          </p>
        </div>
        <ArrowUpRightIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Brief</span>
            <span className="tabular-nums">{client.briefProgressPercent}%</span>
          </div>
          <MiniProgress value={client.briefProgressPercent} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Delivery</span>
            <span className="tabular-nums">
              {client.deliveryProgressPercent}%
            </span>
          </div>
          <MiniProgress value={client.deliveryProgressPercent} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
        {client.plan ? <span className="font-medium">{client.plan}</span> : null}
        {client.projectStatus ? (
          <span>· {client.projectStatus.replace("-", " ")}</span>
        ) : null}
        {client.needsAttention ? (
          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="size-3" />
            {client.attentionCount}
          </span>
        ) : (
          <span className="ml-auto">{relativeTime(client.updatedAt)}</span>
        )}
      </div>
    </button>
  );
}
