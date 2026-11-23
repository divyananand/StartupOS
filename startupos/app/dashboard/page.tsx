"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Blocker, Decision, Doc, Report, Task } from "@/lib/types";
import { byPriority, capitalize, formatDate, known, priorityTone, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/toast";
import {
  Badge,
  buttonClass,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Markdown,
  Page,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CheckSquareIcon,
  FlagIcon,
  LightbulbIcon,
  ReportIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/icons";

type Data = { tasks: Task[]; docs: Doc[]; blockers: Blocker[]; decisions: Decision[]; reports: Report[] };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accent ?? "text-zinc-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();

  const fetchAll = useCallback(
    () =>
      Promise.all([
        api<Task[]>("/tasks"),
        api<Doc[]>("/documents"),
        api<Blocker[]>("/blockers"),
        api<Decision[]>("/decisions"),
        api<Report[]>("/report"),
      ])
        .then(([tasks, docs, blockers, decisions, reports]) => {
          setData({ tasks, docs, blockers, decisions, reports });
          setError(null);
        })
        .catch((e) => setError(errorMessage(e))),
    []
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const load = () => {
    setError(null);
    setData(null);
    void fetchAll();
  };

  async function completeTask(task: Task) {
    if (!data) return;
    const prev = data;
    setData({ ...data, tasks: data.tasks.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)) });
    try {
      await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) });
      toast(`Marked “${task.title}” as done`);
    } catch (e) {
      setData(prev);
      toast(errorMessage(e), "error");
    }
  }

  async function resolveBlocker(blocker: Blocker) {
    if (!data) return;
    const prev = data;
    setData({ ...data, blockers: data.blockers.map((b) => (b.id === blocker.id ? { ...b, status: "resolved" } : b)) });
    try {
      await api(`/blockers/${blocker.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
      toast("Blocker resolved");
    } catch (e) {
      setData(prev);
      toast(errorMessage(e), "error");
    }
  }

  const header = (
    <PageHeader
      title={`${greeting()}${user ? `, ${user.name.split(" ")[0]}` : ""} 👋`}
      description="Here's what's happening with your startup today."
      actions={
        <>
          <Link href="/report" className={buttonClass("secondary")}>
            <ReportIcon /> Weekly report
          </Link>
          <Link href="/extract" className={buttonClass("primary")}>
            <SparklesIcon /> Extract notes
          </Link>
        </>
      }
    />
  );

  if (error) {
    return (
      <Page>
        {header}
        <ErrorState message={error} onRetry={load} />
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        {header}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-12" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </Page>
    );
  }

  const { tasks, docs, blockers, decisions, reports } = data;
  const done = tasks.filter((t) => t.status === "done");
  const open = tasks.filter((t) => t.status !== "done");
  const highOpen = open.filter((t) => t.priority === "high");
  const openBlockers = blockers.filter((b) => b.status === "open");
  const progress = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);
  const upNext = [...open].sort(byPriority).slice(0, 6);
  const recentDecisions = [...decisions].reverse().slice(0, 5);
  const latestReport = reports[reports.length - 1];
  const isEmpty = tasks.length + blockers.length + decisions.length + docs.length === 0;

  return (
    <Page>
      {header}

      {isEmpty && (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col gap-4 bg-linear-to-r from-indigo-50 to-violet-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Your workspace is empty</p>
              <p className="mt-1 text-sm text-zinc-600">
                Paste notes from your last meeting and StartupOS will fill in tasks, blockers and decisions for you.
              </p>
            </div>
            <Link href="/extract" className={buttonClass("primary", "md", "shrink-0")}>
              Get started <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={open.length}
          sub={highOpen.length ? `${highOpen.length} high priority` : `${done.length} completed`}
          href="/tasks"
        />
        <StatCard
          label="Open blockers"
          value={openBlockers.length}
          sub={`${blockers.length - openBlockers.length} resolved`}
          href="#blockers"
          accent={openBlockers.length ? "text-red-600" : undefined}
        />
        <StatCard label="Decisions" value={decisions.length} sub="logged so far" href="#decisions" />
        <StatCard label="Documents" value={docs.length} sub={`${reports.length} report${reports.length === 1 ? "" : "s"} generated`} href="/documents" />
      </div>

      {/* Progress */}
      <Card className="mt-4 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-zinc-700">Task completion</p>
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-900">{done.length}</span> of {tasks.length} done · {progress}%
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Up next"
              icon={<CheckSquareIcon width={16} height={16} />}
              action={
                <Link href="/tasks" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  View all
                </Link>
              }
            />
            {upNext.length === 0 ? (
              <EmptyState
                icon={<CheckIcon />}
                title={tasks.length ? "All caught up" : "No tasks yet"}
                description={tasks.length ? "Every task is done. Nice work!" : "Extract tasks from meeting notes or add them manually."}
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {upNext.map((task) => (
                  <li key={task.id} className="group flex items-center gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => completeTask(task)}
                      aria-label={`Mark "${task.title}" as done`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 text-transparent transition hover:border-emerald-500 hover:text-emerald-500 cursor-pointer"
                    >
                      <CheckIcon width={12} height={12} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
                        {known(task.owner) && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon width={12} height={12} /> {task.owner}
                          </span>
                        )}
                        {known(task.deadline) && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon width={12} height={12} /> {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.priority && <Badge tone={priorityTone(task.priority)}>{capitalize(task.priority)}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Latest report"
              icon={<ReportIcon width={16} height={16} />}
              action={
                latestReport && (
                  <span className="text-xs text-zinc-500">{timeAgo(latestReport.created_at)}</span>
                )
              }
            />
            {latestReport ? (
              <div className="relative">
                <div className="max-h-72 overflow-hidden px-5 py-4">
                  <Markdown>{latestReport.content}</Markdown>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t from-white via-white/90 to-transparent pb-4">
                  <Link href="/report" className={buttonClass("secondary", "sm")}>
                    Read full report
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<ReportIcon />}
                title="No reports yet"
                description="Generate a weekly AI summary of progress, blockers and priorities."
                action={
                  <Link href="/report" className={buttonClass("secondary", "sm")}>
                    Generate report
                  </Link>
                }
              />
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card>
            <div id="blockers" className="scroll-mt-20" />
            <CardHeader
              title="Open blockers"
              icon={<AlertIcon width={16} height={16} />}
              action={openBlockers.length > 0 && <Badge tone="red">{openBlockers.length}</Badge>}
            />
            {openBlockers.length === 0 ? (
              <EmptyState icon={<FlagIcon />} title="No open blockers" description="Nothing is standing in your way." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {openBlockers.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-800">{b.title}</p>
                      {b.created_at && <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(b.created_at)}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => resolveBlocker(b)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                    >
                      Resolve
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div id="decisions" className="scroll-mt-20" />
            <CardHeader title="Recent decisions" icon={<LightbulbIcon width={16} height={16} />} />
            {recentDecisions.length === 0 ? (
              <EmptyState icon={<LightbulbIcon />} title="No decisions yet" description="Decisions from your meetings will appear here." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recentDecisions.map((d) => (
                  <li key={d.id} className="px-5 py-3">
                    <p className="text-sm text-zinc-800">{d.title}</p>
                    {d.created_at && <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(d.created_at)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
