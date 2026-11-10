"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  FileTextIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import type { ClientDetail, ClientTab } from "@/lib/admin/types";
import { CLIENT_TABS } from "@/lib/admin/types";
import { relativeTime } from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClientSidebar,
  type ClientFilter,
} from "@/components/admin/client-sidebar";
import { MiniProgress, PanelSkeleton, SidebarSkeleton } from "@/components/admin/admin-ui";
import {
  BriefStatusBadge,
  PlanBadge,
  ProjectStatusBadge,
} from "@/components/admin/status-badges";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { BriefPanel } from "@/components/admin/brief-panel";
import { DeliveryPanel } from "@/components/admin/delivery-panel";
import { AgreementPanel } from "@/components/admin/agreement-panel";
import { FilesPanel } from "@/components/admin/files-panel";
import { ActivityPanel } from "@/components/admin/activity-panel";

type Admin = { name: string; email: string; username?: string | null };

export function AdminWorkspace({ admin }: { admin: Admin }) {
  const clients = useQuery(api.clients.list, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ClientTab>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeId =
    selectedId && clients?.some((client) => client.authUserId === selectedId)
      ? selectedId
      : (clients?.[0]?.authUserId ?? null);

  const detail = useQuery(
    api.clients.getClient,
    activeId ? { authUserId: activeId } : "skip",
  );

  const counts = useMemo(() => {
    const rows = clients ?? [];
    return {
      all: rows.length,
      attention: rows.filter((client) => client.needsAttention).length,
      draft: rows.filter((client) => client.briefStatus === "draft").length,
      active: rows.filter(
        (client) =>
          client.projectStatus === "in-progress" ||
          client.projectStatus === "planning",
      ).length,
      complete: rows.filter((client) => client.projectStatus === "complete").length,
    } satisfies Record<ClientFilter, number>;
  }, [clients]);

  const filteredClients = useMemo(() => {
    const rows = clients ?? [];
    const search = query.trim().toLowerCase();
    return rows.filter((client) => {
      if (filter === "attention" && !client.needsAttention) return false;
      if (filter === "draft" && client.briefStatus !== "draft") return false;
      if (
        filter === "active" &&
        client.projectStatus !== "in-progress" &&
        client.projectStatus !== "planning"
      ) {
        return false;
      }
      if (filter === "complete" && client.projectStatus !== "complete") {
        return false;
      }
      if (!search) return true;
      return [
        client.businessName,
        client.contactName,
        client.contactEmail,
        client.email,
        client.name,
        client.plan ?? "",
        client.currentStage ?? "",
        client.projectStatus ?? "",
        ...client.selectedWork,
        ...client.selectedModules,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [clients, filter, query]);

  function selectClient(id: string) {
    setSelectedId(id);
    setMobileOpen(false);
  }

  const sidebarProps = {
    admin,
    clients: filteredClients,
    totalCount: clients?.length ?? 0,
    selectedId: activeId,
    onSelect: selectClient,
    query,
    onQueryChange: setQuery,
    filter,
    onFilterChange: setFilter,
    counts,
  };

  return (
    <div className="flex h-svh w-full overflow-hidden bg-muted/20">
      <aside className="hidden w-[320px] shrink-0 border-r lg:block">
        {clients === undefined ? <SidebarSkeleton /> : <ClientSidebar {...sidebarProps} />}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open client list"
          >
            <MenuIcon />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {detail?.summary.businessName || "Agency Desk"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {clients?.length ?? 0} clients
            </p>
          </div>
        </div>

        {clients === undefined ? (
          <PanelSkeleton />
        ) : clients.length === 0 ? (
          <EmptyWorkspace />
        ) : !activeId ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Select a client to begin.
          </div>
        ) : detail === undefined ? (
          <PanelSkeleton />
        ) : (
          <ClientWorkspace
            key={detail.authUserId}
            client={detail}
            tab={tab}
            onTabChange={setTab}
          />
        )}
      </main>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[320px] gap-0 p-0 sm:max-w-[320px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Client list</SheetTitle>
          </SheetHeader>
          <ClientSidebar {...sidebarProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClientWorkspace({
  client,
  tab,
  onTabChange,
}: {
  client: ClientDetail;
  tab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
}) {
  const [projectOpenSignal, setProjectOpenSignal] = useState(0);
  const openChecks = client.checks.filter(
    (check) => check.status !== "complete",
  );

  function editProject() {
    onTabChange("delivery");
    setProjectOpenSignal((value) => value + 1);
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as ClientTab)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <header className="border-b bg-background px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {(client.summary.businessName || client.summary.contactName || "?")
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-semibold tracking-tight">
                  {client.summary.businessName}
                </h1>
                <BriefStatusBadge status={client.draft?.status ?? null} />
                <ProjectStatusBadge status={client.project?.status ?? null} />
                <PlanBadge plan={client.engagement?.plan ?? null} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{client.summary.contactName || client.user?.name || "No contact name"}</span>
                <span>{client.summary.contactEmail || client.user?.email || "No email"}</span>
                <span className="flex items-center gap-1">
                  <CalendarClockIcon className="size-3" />
                  Brief saved {relativeTime(client.draft?.updatedAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {openChecks.length ? (
              <Badge variant="destructive">
                <AlertTriangleIcon data-icon="inline-start" />
                {openChecks.length} open
              </Badge>
            ) : (
              <Badge variant="secondary">
                <CheckCircle2Icon data-icon="inline-start" />
                Up to date
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTabChange("activity")}
            >
              <MessageSquarePlusIcon data-icon="inline-start" />
              Add update
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MiniStat
            label="Brief"
            value={`${client.progress.percent}%`}
            detail={`${client.progress.completed}/${client.progress.total} answers`}
            progress={client.progress.percent}
          />
          <MiniStat
            label="Delivery"
            value={`${client.deliveryAverage}%`}
            detail={
              client.stages.length
                ? `${client.stages.filter((stage) => stage.status === "complete").length}/${client.stages.length} stages`
                : "No stages"
            }
            progress={client.deliveryAverage}
          />
          <MiniStat
            label="Open items"
            value={String(openChecks.length)}
            detail="missing data & follow-ups"
            icon={<CircleAlertIcon className="size-3.5" />}
          />
          <MiniStat
            label="Files"
            value={String(client.documents.length)}
            detail={
              client.documents.length
                ? `Latest ${relativeTime(client.documents[0]?.uploadedAt)}`
                : "Nothing uploaded"
            }
            icon={<FileTextIcon className="size-3.5" />}
          />
        </div>

        <TabsList
          variant="line"
          className="mt-4 w-full justify-start overflow-x-auto"
        >
          {CLIENT_TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
              {item.value === "brief" && client.openItems.length ? (
                <Badge variant="destructive">{client.openItems.length}</Badge>
              ) : null}
              {item.value === "files" && client.documents.length ? (
                <Badge variant="outline">{client.documents.length}</Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 md:p-6">
          <TabsContent value="overview" className="outline-none">
            <OverviewPanel
              client={client}
              onNavigate={onTabChange}
              onEditProject={editProject}
            />
          </TabsContent>
          <TabsContent value="brief" className="outline-none">
            <BriefPanel client={client} />
          </TabsContent>
          <TabsContent value="delivery" className="outline-none">
            <DeliveryPanel
              key={`${client.authUserId}-${projectOpenSignal}`}
              client={client}
              initialProjectOpen={projectOpenSignal > 0}
            />
          </TabsContent>
          <TabsContent value="agreement" className="outline-none">
            <AgreementPanel client={client} />
          </TabsContent>
          <TabsContent value="files" className="outline-none">
            <FilesPanel client={client} />
          </TabsContent>
          <TabsContent value="activity" className="outline-none">
            <ActivityPanel client={client} />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );
}

function MiniStat({
  label,
  value,
  detail,
  progress,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-background p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {value}
        </span>
      </div>
      {progress !== undefined ? <MiniProgress value={progress} /> : null}
      <span className="truncate text-[11px] text-muted-foreground">{detail}</span>
    </div>
  );
}

function EmptyWorkspace() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <UsersIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-lg font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground">
              This dashboard reads client briefs, agreements, project progress,
              files, and activity directly from Convex.
            </p>
          </div>
          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            The admin app must point at the same Convex deployment as the client
            app. If you are using a separate local admin deployment, connect it
            to your client project and reload this page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <SparklesIcon data-icon="inline-start" />
            Refresh records
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
