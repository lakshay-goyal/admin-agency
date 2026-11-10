import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type ClientRow = FunctionReturnType<typeof api.clients.list>[number];
export type ClientDetail = FunctionReturnType<typeof api.clients.getClient>;

export type ClientTab =
  | "overview"
  | "brief"
  | "delivery"
  | "agreement"
  | "files"
  | "activity";

export const CLIENT_TABS: { value: ClientTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "brief", label: "Project brief" },
  { value: "delivery", label: "Delivery" },
  { value: "agreement", label: "Agreement" },
  { value: "files", label: "Files" },
  { value: "activity", label: "Activity" },
];
