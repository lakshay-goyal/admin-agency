import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { formatFileSize } from "@/lib/onboarding/documents";

export { formatFileSize };

export function formatDateTime(value: number | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return isValid(date) ? format(date, "d MMM yyyy, HH:mm") : "—";
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMM yyyy") : value;
}

export function relativeTime(value: number | null | undefined) {
  if (!value) return "—";
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function initials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMoney(
  currency: string | null | undefined,
  amount: number | null | undefined,
) {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "Not recorded";
  }
  if (!currency) return amount.toLocaleString();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function toDateInput(value: number | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

export function fromDateInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return isValid(date) ? date.getTime() : null;
}

export function linesToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function arrayToLines(value: string[] | undefined) {
  return (value ?? []).join("\n");
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
      .replace(/^Uncaught ConvexError:\s*/i, "")
      .replace(/^\[CONVEX [^\]]+\]\s*/i, "")
      .split("Called by client")[0]
      .trim();
  }
  return "Something went wrong. Please try again.";
}

export function percent(value: number, total: number) {
  return Math.round((value / Math.max(1, total)) * 100);
}
