"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Blocker, Decision, Report, Task } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Badge, buttonClass, Card, Page, PageHeader, Skeleton } from "@/components/ui";
import { ArrowRightIcon, ChatIcon, ReportIcon, SparklesIcon } from "@/components/icons";

type Stats = { tasks: number; blockers: number; decisions: number; reports: number; lastReport: string | null };

export default function AgentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Task[]>("/tasks"),
      api<Blocker[]>("/blockers"),
      api<Decision[]>("/decisions"),
      api<Report[]>("/report"),
    ])
      .then(([tasks, blockers, decisions, reports]) =>
        setStats({
          tasks: tasks.length,
          blockers: blockers.length,
          decisions: decisions.length,
          reports: reports.length,
          lastReport: reports[reports.length - 1]?.created_at ?? null,
        })
      )
      .catch(() => setOffline(true));
  }, []);

  const agents = [
    {
      name: "Meeting Extractor",
      icon: SparklesIcon,
      href: "/extract",
      cta: "Extract notes",
      description: "Reads raw meeting notes and turns them into tasks (with owner, priority and deadline), blockers and decisions.",
      reads: "Meeting notes",
      writes: "Tasks, blockers, decisions",
      stat: stats && `${stats.tasks + stats.blockers + stats.decisions} items in your workspace`,
    },
    {
      name: "Ask Assistant",
      icon: ChatIcon,
      href: "/ask",
      cta: "Ask a question",
      description: "Answers questions in plain English using your company data, and remembers the conversation for follow-ups.",
      reads: "Tasks, blockers, decisions, documents",
      writes: "Nothing (read-only)",
      stat: stats && `${stats.tasks} tasks and ${stats.decisions} decisions available as context`,
    },
    {
      name: "Report Writer",
      icon: ReportIcon,
      href: "/report",
      cta: "Generate report",
      description: "Summarises the last 7 days into progress, open blockers, key decisions and next week's priorities.",
      reads: "Last 7 days of activity",
      writes: "Weekly reports",
      stat:
        stats &&
        (stats.reports
          ? `${stats.reports} report${stats.reports === 1 ? "" : "s"} · last ${timeAgo(stats.lastReport) || "recently"}`
          : "No reports yet"),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="AI agents"
        description="The Claude-powered workers behind StartupOS. Each one runs when you trigger it."
        actions={
          <Badge tone={offline ? "red" : "green"} className="h-7 px-2.5">
            <span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-red-500" : "bg-emerald-500"}`} />
            {offline ? "Backend offline" : "Ready"}
          </Badge>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <Card key={a.name} className="flex flex-col p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <a.icon />
              </span>
              <h2 className="font-semibold text-zinc-900">{a.name}</h2>
            </div>
            <p className="mt-4 text-sm text-zinc-600">{a.description}</p>

            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-zinc-400">Reads</dt>
                <dd className="text-zinc-700">{a.reads}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-zinc-400">Writes</dt>
                <dd className="text-zinc-700">{a.writes}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-1 flex-col justify-end gap-4 border-t border-zinc-100 pt-4">
              {offline ? (
                <p className="text-xs text-zinc-400">Activity unavailable</p>
              ) : a.stat ? (
                <p className="text-xs text-zinc-500">{a.stat}</p>
              ) : (
                <Skeleton className="h-3 w-40" />
              )}
              <Link href={a.href} className={buttonClass("secondary", "sm", "self-start")}>
                {a.cta} <ArrowRightIcon width={14} height={14} />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
