export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** True for real values; the AI fills unknown fields with the string "unknown". */
export function known(value: string | null | undefined): value is string {
  return !!value && value.trim() !== "" && value.trim().toLowerCase() !== "unknown";
}

function parseDate(value: string): Date | null {
  // Plain dates ("2026-11-20") are local calendar days, not UTC midnight.
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) return new Date(+plain[1], +plain[2] - 1, +plain[3]);
  // Postgres timestamps without a zone are stored in UTC.
  const iso = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const d = new Date(iso ? value.replace(" ", "T") + "Z" : value);
  return isNaN(d.getTime()) ? null : d;
}

/** Friendly date; falls back to the raw text for things like "Friday". */
export function formatDate(value: string | null | undefined) {
  if (!known(value)) return "";
  const d = parseDate(value);
  if (!d) return value;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function timeAgo(value: string | null | undefined) {
  if (!known(value)) return "";
  const d = parseDate(value);
  if (!d) return value;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export type Tone = "gray" | "green" | "blue" | "amber" | "red" | "indigo";

export const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};

export function statusTone(status: string | null | undefined): Tone {
  if (status === "done") return "green";
  if (status === "in-progress") return "blue";
  return "gray";
}

export function priorityTone(priority: string | null | undefined): Tone {
  if (priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "gray";
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
export function byPriority(a: { priority: string | null }, b: { priority: string | null }) {
  return (PRIORITY_RANK[a.priority ?? ""] ?? 3) - (PRIORITY_RANK[b.priority ?? ""] ?? 3);
}

export function capitalize(s: string | null | undefined) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
