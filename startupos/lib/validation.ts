// Mirrors backend/validation.py so forms can explain problems before saving.
// The server still enforces every rule.

const VAGUE_OWNERS = new Set([
  "", "unknown", "none", "null", "n/a", "na", "tbd", "tba", "?", "-",
  "we", "us", "team", "the team", "everyone", "everybody", "all",
  "someone", "somebody", "anyone", "anybody", "they", "them", "whoever",
]);

export function isVagueOwner(owner: string | null | undefined) {
  return owner == null || VAGUE_OWNERS.has(owner.trim().toLowerCase().replace(/\s+/g, " "));
}

export function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
}

/** Today in the user's own timezone, as YYYY-MM-DD (what <input type="date"> uses). */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type TaskFields = { title: string; owner: string | null; deadline: string | null; priority: string | null };
export type TaskField = keyof TaskFields;

/** Which fields still need fixing, with a message for each. */
export function taskProblems(t: TaskFields): Partial<Record<TaskField, string>> {
  const p: Partial<Record<TaskField, string>> = {};
  if (t.title.trim().length < 3) p.title = "Give the task a title (3+ characters).";
  if (!t.owner?.trim()) p.owner = "Who owns this task?";
  else if (isVagueOwner(t.owner)) p.owner = `“${t.owner.trim()}” isn't a specific person.`;
  if (!isIsoDate(t.deadline)) p.deadline = "Pick a due date.";
  else if (t.deadline < todayIso()) p.deadline = "That date is in the past.";
  if (!t.priority) p.priority = "How urgent is it?";
  return p;
}

/** For tasks saved before validation existed: what's missing or vague. */
export function legacyTaskGaps(t: { owner: string | null; deadline: string | null; status: string }) {
  if (t.status === "done") return [];
  const gaps: string[] = [];
  if (isVagueOwner(t.owner)) gaps.push("owner");
  if (!isIsoDate(t.deadline)) gaps.push("due date");
  return gaps;
}
