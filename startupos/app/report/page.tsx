"use client";

import { useMemo, useState } from "react";
import { api, errorMessage, useApi } from "@/lib/api";
import type { Report } from "@/lib/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, ErrorState, Markdown, Page, PageHeader, Skeleton } from "@/components/ui";
import { CopyIcon, ReportIcon, SparklesIcon } from "@/components/icons";

export default function ReportsPage() {
  const { data, setData, error, loading, reload } = useApi<Report[]>("/report");
  const reports = useMemo(() => [...(data ?? [])].reverse(), [data]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const selected = reports.find((r) => r.id === selectedId) ?? reports[0];

  async function generate() {
    setGenerating(true);
    try {
      const res = await api<{ report: string; item: Report }>("/report", { method: "POST" });
      setData([...(data ?? []), res.item]);
      setSelectedId(res.item.id);
      toast("Weekly report generated");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.content);
      toast("Report copied as Markdown");
    } catch {
      toast("Couldn't copy to clipboard", "error");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Weekly reports"
        description="Claude summarises the last 7 days of tasks, blockers and decisions into an execution report."
        actions={
          <Button onClick={generate} loading={generating}>
            {!generating && <SparklesIcon width={16} height={16} />}
            {generating ? "Generating…" : "Generate report"}
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      ) : reports.length === 0 && !generating ? (
        <Card>
          <EmptyState
            icon={<ReportIcon />}
            title="No reports yet"
            description="Generate your first weekly report. It works best after you've extracted a few meetings."
            action={
              <Button onClick={generate}>
                <SparklesIcon width={16} height={16} /> Generate report
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* History */}
          <Card className="overflow-hidden lg:sticky lg:top-6">
            <p className="border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              History · {reports.length}
            </p>
            <ul className="flex gap-2 overflow-x-auto p-2 lg:max-h-[60vh] lg:flex-col lg:gap-0.5 lg:overflow-y-auto">
              {reports.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <li key={r.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left transition-colors cursor-pointer",
                        active ? "bg-indigo-50" : "hover:bg-zinc-50"
                      )}
                    >
                      <p className={cn("text-sm font-medium", active ? "text-indigo-700" : "text-zinc-800")}>
                        {r.title}
                      </p>
                      <p className="text-xs text-zinc-500">{formatDate(r.created_at) || `#${r.id}`}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Viewer */}
          <Card>
            {generating ? (
              <div className="p-6">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <SparklesIcon width={16} height={16} className="animate-pulse text-indigo-500" />
                  Claude is writing your report…
                </p>
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="mt-6 h-5 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ) : (
              selected && (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4">
                    <div>
                      <h2 className="font-semibold text-zinc-900">{selected.title}</h2>
                      <p className="text-xs text-zinc-500">
                        {selected.created_at ? `Generated ${timeAgo(selected.created_at)}` : `Report #${selected.id}`}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={copy}>
                      <CopyIcon width={14} height={14} /> Copy
                    </Button>
                  </div>
                  <div className="px-6 py-5">
                    <Markdown>{selected.content}</Markdown>
                  </div>
                </>
              )
            )}
          </Card>
        </div>
      )}
    </Page>
  );
}
