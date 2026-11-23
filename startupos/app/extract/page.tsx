"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { DraftStatement, DraftTask, ExtractionDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { taskProblems, todayIso, type TaskField } from "@/lib/validation";
import { useToast } from "@/components/toast";
import { Badge, Button, buttonClass, Card, CardHeader, ErrorState, inputClass, Page, PageHeader, Skeleton } from "@/components/ui";
import {
  AlertIcon,
  ArrowRightIcon,
  BotIcon,
  CheckIcon,
  CheckSquareIcon,
  LightbulbIcon,
  SparklesIcon,
} from "@/components/icons";

// Deliberately leaves some owners and deadlines out, to show the follow-up questions.
const SAMPLE = `Product sync – Thursday

Attendees: Maya, Leo, Priya

- Maya will ship the CSV export by next Wednesday. High priority, two customers are waiting on it.
- We need to fix the login timeout bug soon, people keep getting logged out.
- Someone should update the pricing page with the new plans.
- Leo to book a venue for the launch party by December 10th, nice to have.
- Still waiting on Apple to review the iOS app, so we can't announce mobile yet.
- Decided to price the Pro plan at $29/month.
- Agreed to pause paid ads until onboarding conversion improves.`;

type ReviewTask = Omit<DraftTask, "duplicate"> & { key: number; include: boolean; duplicate: boolean };
type ReviewStatement = DraftStatement & { key: number; include: boolean };

let nextKey = 0;

function toReview(draft: ExtractionDraft) {
  return {
    tasks: draft.tasks.map<ReviewTask>((t) => ({ ...t, key: nextKey++, include: !t.duplicate })),
    blockers: draft.blockers.map<ReviewStatement>((s) => ({ ...s, key: nextKey++, include: !s.duplicate })),
    decisions: draft.decisions.map<ReviewStatement>((s) => ({ ...s, key: nextKey++, include: !s.duplicate })),
  };
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-indigo-600"
    />
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
      <AlertIcon width={12} height={12} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function TaskReview({
  task,
  onChange,
}: {
  task: ReviewTask;
  onChange: (patch: Partial<ReviewTask>) => void;
}) {
  const problems = task.include ? taskProblems(task) : {};
  const ready = Object.keys(problems).length === 0;
  const message = (field: TaskField) => {
    const problem = problems[field];
    if (!problem) return undefined;
    const fromNotes = field !== "title" ? task.issues[field] : undefined;
    return fromNotes && problem !== fromNotes ? `${fromNotes} ${problem}` : problem;
  };
  const warn = (field: TaskField) => (problems[field] ? "border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-500/20" : "");

  return (
    <li className={cn("px-5 py-4 transition-opacity", !task.include && "opacity-50")}>
      <div className="flex items-start gap-3">
        <Checkbox checked={task.include} onChange={(include) => onChange({ include })} label={`Include “${task.title}”`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              aria-label="Task title"
              className={cn(inputClass, "font-medium", warn("title"))}
              value={task.title}
              onChange={(e) => onChange({ title: e.target.value })}
              disabled={!task.include}
            />
            <div className="flex shrink-0 gap-1.5">
              {task.duplicate && <Badge tone="gray">Already in your tasks</Badge>}
              {task.include && (ready ? <Badge tone="green"><CheckIcon width={12} height={12} /> Ready</Badge> : <Badge tone="amber">Needs details</Badge>)}
            </div>
          </div>
          <FieldError>{message("title")}</FieldError>

          {task.include && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`owner-${task.key}`}>
                  Owner
                </label>
                <input
                  id={`owner-${task.key}`}
                  className={cn(inputClass, warn("owner"))}
                  placeholder="Person responsible"
                  value={task.owner ?? ""}
                  onChange={(e) => onChange({ owner: e.target.value })}
                />
                <FieldError>{message("owner")}</FieldError>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`due-${task.key}`}>
                  Due date
                  {task.deadline_mentioned && <span className="font-normal text-zinc-400"> · notes said “{task.deadline_mentioned}”</span>}
                </label>
                <input
                  id={`due-${task.key}`}
                  type="date"
                  min={todayIso()}
                  className={cn(inputClass, warn("deadline"))}
                  value={task.deadline ?? ""}
                  onChange={(e) => onChange({ deadline: e.target.value || null })}
                />
                <FieldError>{message("deadline")}</FieldError>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500" htmlFor={`prio-${task.key}`}>
                  Priority
                </label>
                <select
                  id={`prio-${task.key}`}
                  className={cn(inputClass, warn("priority"))}
                  value={task.priority ?? ""}
                  onChange={(e) => onChange({ priority: (e.target.value || null) as ReviewTask["priority"] })}
                >
                  <option value="">Choose…</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <FieldError>{message("priority")}</FieldError>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StatementReview({
  items,
  kind,
  onChange,
}: {
  items: ReviewStatement[];
  kind: "blocker" | "decision";
  onChange: (key: number, patch: Partial<ReviewStatement>) => void;
}) {
  if (items.length === 0) return <p className="px-5 py-6 text-sm text-zinc-400">None found in these notes.</p>;
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((s) => {
        const tooShort = s.include && s.text.trim().length < 5;
        return (
          <li key={s.key} className={cn("flex items-start gap-3 px-5 py-3", !s.include && "opacity-50")}>
            <Checkbox checked={s.include} onChange={(include) => onChange(s.key, { include })} label={`Include ${kind}`} />
            <div className="min-w-0 flex-1">
              <input
                aria-label={`${kind} text`}
                className={cn(inputClass, tooShort && "border-amber-400")}
                value={s.text}
                onChange={(e) => onChange(s.key, { text: e.target.value })}
                disabled={!s.include}
              />
              {tooShort && <FieldError>Describe it in a few more words.</FieldError>}
            </div>
            {s.duplicate && <Badge tone="gray" className="mt-2">Already saved</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

export default function ExtractPage() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "review" | "saved">("input");
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [review, setReview] = useState<ReturnType<typeof toReview> | null>(null);
  const [saved, setSaved] = useState<{ tasks: number; blockers: number; decisions: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleExtract() {
    if (text.trim().length < 20 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api<ExtractionDraft>("/extract", { method: "POST", body: JSON.stringify({ text }) });
      setDraft(d);
      setReview(toReview(d));
      setPhase("review");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    if (!review) return null;
    const tasks = review.tasks.filter((t) => t.include);
    const blockers = review.blockers.filter((b) => b.include);
    const decisions = review.decisions.filter((d) => d.include);
    const incompleteTasks = tasks.filter((t) => Object.keys(taskProblems(t)).length > 0).length;
    const badStatements = [...blockers, ...decisions].filter((s) => s.text.trim().length < 5).length;
    const count = tasks.length + blockers.length + decisions.length;
    return { tasks, blockers, decisions, incompleteTasks, badStatements, count, ok: count > 0 && !incompleteTasks && !badStatements };
  }, [review]);

  async function handleSave() {
    if (!summary?.ok) return;
    setSaving(true);
    try {
      const res = await api<{ saved: { tasks: number; blockers: number; decisions: number } }>("/extract/save", {
        method: "POST",
        body: JSON.stringify({
          tasks: summary.tasks.map((t) => ({ title: t.title, owner: t.owner, deadline: t.deadline, priority: t.priority })),
          blockers: summary.blockers.map((b) => b.text),
          decisions: summary.decisions.map((d) => d.text),
        }),
      });
      setSaved(res.saved);
      setPhase("saved");
      toast("Saved to your workspace");
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  function updateTask(key: number, patch: Partial<ReviewTask>) {
    setReview((r) => r && { ...r, tasks: r.tasks.map((t) => (t.key === key ? { ...t, ...patch } : t)) });
  }
  function updateStatement(kind: "blockers" | "decisions") {
    return (key: number, patch: Partial<ReviewStatement>) =>
      setReview((r) => r && { ...r, [kind]: r[kind].map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  }

  function startOver(keepText: boolean) {
    if (!keepText) setText("");
    setDraft(null);
    setReview(null);
    setSaved(null);
    setPhase("input");
  }

  // ---------- Saved ----------
  if (phase === "saved" && saved) {
    const parts = [
      saved.tasks && `${saved.tasks} task${saved.tasks === 1 ? "" : "s"}`,
      saved.blockers && `${saved.blockers} blocker${saved.blockers === 1 ? "" : "s"}`,
      saved.decisions && `${saved.decisions} decision${saved.decisions === 1 ? "" : "s"}`,
    ].filter(Boolean);
    return (
      <Page className="max-w-2xl">
        <Card className="fade-up p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-zinc-900">Saved to your workspace</h1>
          <p className="mt-1 text-sm text-zinc-500">Added {parts.join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className={buttonClass("primary")}>
              View dashboard <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/tasks" className={buttonClass("secondary")}>
              Go to tasks
            </Link>
            <Button variant="ghost" onClick={() => startOver(false)}>
              Extract more notes
            </Button>
          </div>
        </Card>
      </Page>
    );
  }

  // ---------- Review ----------
  if (phase === "review" && draft && review && summary) {
    const empty = review.tasks.length + review.blockers.length + review.decisions.length === 0;
    return (
      <Page className="max-w-4xl pb-32">
        <PageHeader
          title="Review & complete"
          description="Nothing is saved yet. Fill in anything missing, untick what you don't want, then save."
          actions={
            <Button variant="secondary" onClick={() => startOver(true)}>
              Edit notes
            </Button>
          }
        />

        {/* The assistant's follow-up questions */}
        <div className="fade-up mb-6 flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
            <BotIcon width={18} height={18} />
          </div>
          <div
            className={cn(
              "flex-1 rounded-2xl rounded-tl-md border px-4 py-3 text-sm",
              draft.complete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
            )}
          >
            <p className="font-medium">{draft.message}</p>
            {draft.questions.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {draft.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {empty ? (
          <Button variant="secondary" onClick={() => startOver(true)}>
            Back to notes
          </Button>
        ) : (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Tasks" icon={<CheckSquareIcon width={16} height={16} />} action={<Badge>{review.tasks.length}</Badge>} />
              {review.tasks.length === 0 ? (
                <p className="px-5 py-6 text-sm text-zinc-400">None found in these notes.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {review.tasks.map((t) => (
                    <TaskReview key={t.key} task={t} onChange={(patch) => updateTask(t.key, patch)} />
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Blockers" icon={<AlertIcon width={16} height={16} />} action={<Badge>{review.blockers.length}</Badge>} />
              <StatementReview items={review.blockers} kind="blocker" onChange={updateStatement("blockers")} />
            </Card>
            <Card>
              <CardHeader title="Decisions" icon={<LightbulbIcon width={16} height={16} />} action={<Badge>{review.decisions.length}</Badge>} />
              <StatementReview items={review.decisions} kind="decision" onChange={updateStatement("decisions")} />
            </Card>
          </div>
        )}

        {/* Save bar */}
        {!empty && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur lg:left-60">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
              <p className="text-sm">
                {summary.incompleteTasks > 0 ? (
                  <span className="font-medium text-amber-700">
                    {summary.incompleteTasks} task{summary.incompleteTasks === 1 ? " needs" : "s need"} details before saving
                  </span>
                ) : summary.badStatements > 0 ? (
                  <span className="font-medium text-amber-700">Some items need a longer description</span>
                ) : summary.count === 0 ? (
                  <span className="text-zinc-500">Select at least one item</span>
                ) : (
                  <span className="text-zinc-600">
                    Ready to save <span className="font-semibold text-zinc-900">{summary.count}</span> item{summary.count === 1 ? "" : "s"}
                  </span>
                )}
              </p>
              <Button onClick={handleSave} loading={saving} disabled={!summary.ok}>
                {!saving && <CheckIcon width={16} height={16} />} Save to workspace
              </Button>
            </div>
          </div>
        )}
      </Page>
    );
  }

  // ---------- Input ----------
  return (
    <Page>
      <PageHeader
        title="Meeting extractor"
        description="Paste raw meeting notes. Claude pulls out tasks, blockers and decisions, then asks you for anything that's missing before saving."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader
            title="Meeting notes"
            icon={<SparklesIcon width={16} height={16} />}
            action={
              !text && (
                <button
                  type="button"
                  onClick={() => setText(SAMPLE)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                >
                  Try sample notes
                </button>
              )
            }
          />
          <div className="p-5">
            <label htmlFor="notes" className="sr-only">Meeting notes</label>
            <textarea
              id="notes"
              className={cn(inputClass, "min-h-80 resize-y font-mono text-[13px] leading-relaxed")}
              placeholder="Paste your meeting notes here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExtract();
              }}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">
                {text.length > 0 && text.trim().length < 20
                  ? "Add a bit more detail (20+ characters)"
                  : `${text.length > 0 ? `${text.length.toLocaleString()} characters · ` : ""}Ctrl + Enter to extract`}
              </p>
              <div className="flex gap-2">
                {text && (
                  <Button variant="ghost" onClick={() => setText("")} disabled={loading}>
                    Clear
                  </Button>
                )}
                <Button onClick={handleExtract} loading={loading} disabled={text.trim().length < 20}>
                  {!loading && <SparklesIcon width={16} height={16} />}
                  {loading ? "Extracting…" : "Extract"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {error && <ErrorState message={error} onRetry={handleExtract} />}
          {loading ? (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <SparklesIcon width={16} height={16} className="animate-pulse text-indigo-500" />
                Claude is reading your notes…
              </p>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-sm font-semibold text-zinc-900">How it works</p>
              <ol className="mt-4 space-y-4 text-sm">
                {[
                  ["Extract", "Claude reads your notes and pulls out tasks, blockers and decisions."],
                  ["Fill the gaps", "Every task needs an owner, a real due date and a priority. If the notes don't say, you'll be asked."],
                  ["Save", "Nothing is saved until you confirm. Items already in your workspace are flagged so you don't get duplicates."],
                ].map(([title, desc], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900">{title}</p>
                      <p className="text-zinc-500">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
