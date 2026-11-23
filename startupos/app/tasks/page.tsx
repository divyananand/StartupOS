"use client";

import { useMemo, useState } from "react";
import { api, errorMessage, useApi } from "@/lib/api";
import type { Task } from "@/lib/types";
import { byPriority, capitalize, cn, formatDate, known, priorityTone, STATUS_LABEL } from "@/lib/utils";
import { isIsoDate, legacyTaskGaps, taskProblems, todayIso } from "@/lib/validation";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, inputClass, Page, PageHeader, Skeleton } from "@/components/ui";
import {
  AlertIcon,
  CalendarIcon,
  CheckIcon,
  CheckSquareIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "needs-details", label: "Needs details" },
] as const;

const STATUS_SELECT_STYLE: Record<string, string> = {
  todo: "bg-zinc-100 text-zinc-700",
  "in-progress": "bg-sky-50 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
};

type Editable = { title: string; owner: string; deadline: string; priority: string };

function TaskEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Editable;
  onCancel: () => void;
  onSave: (v: Editable) => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const problems = taskProblems(v);
  const show = (f: keyof Editable) => (touched ? problems[f] : undefined);

  return (
    <form
      className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.keys(problems).length) return;
        setSaving(true);
        await onSave(v);
        setSaving(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        {(
          [
            ["title", "Title", "text"],
            ["owner", "Owner", "text"],
            ["deadline", "Due date", "date"],
          ] as const
        ).map(([field, label, type]) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              {label}
              <input
                type={type}
                min={type === "date" ? todayIso() : undefined}
                className={cn(inputClass, "mt-1 font-normal", show(field) && "border-amber-400")}
                value={v[field]}
                onChange={(e) => setV({ ...v, [field]: e.target.value })}
              />
            </label>
            {show(field) && <p className="mt-1 text-xs text-amber-700">{show(field)}</p>}
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Priority
            <select
              className={cn(inputClass, "mt-1 font-normal", show("priority") && "border-amber-400")}
              value={v.priority}
              onChange={(e) => setV({ ...v, priority: e.target.value })}
            >
              <option value="">Choose…</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          {show("priority") && <p className="mt-1 text-xs text-amber-700">{show("priority")}</p>}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const { data, setData, error, loading, reload } = useApi<Task[]>("/tasks");
  const tasks = useMemo(() => data ?? [], [data]);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [query, setQuery] = useState("");

  const formProblems = taskProblems({ title, owner, deadline: date || null, priority: priority || null });
  const formError = formTouched ? Object.values(formProblems)[0] : undefined;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length, todo: 0, "in-progress": 0, done: 0, "needs-details": 0 };
    for (const t of tasks) {
      c[t.status] = (c[t.status] ?? 0) + 1;
      if (legacyTaskGaps(t).length) c["needs-details"] += 1;
    }
    return c;
  }, [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) =>
        statusFilter === "all" ? true : statusFilter === "needs-details" ? legacyTaskGaps(t).length > 0 : t.status === statusFilter
      )
      .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.owner ?? "").toLowerCase().includes(q))
      .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || byPriority(a, b) || b.id - a.id);
  }, [tasks, statusFilter, priorityFilter, query]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setFormTouched(true);
    if (Object.keys(formProblems).length) return;
    setSaving(true);
    try {
      const created = await api<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), owner: owner.trim(), deadline: date, priority, status: "todo" }),
      });
      setData([...tasks, created]);
      setTitle("");
      setOwner("");
      setDate("");
      setPriority("");
      setFormTouched(false);
      toast("Task added");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: Task, changes: Record<string, string>) {
    const prev = tasks;
    setData(tasks.map((t) => (t.id === task.id ? { ...t, ...changes } : t)));
    try {
      const updated = await api<Task>(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setData((cur) => (cur ?? []).map((t) => (t.id === task.id ? updated : t)));
      return true;
    } catch (err) {
      setData(prev);
      toast(errorMessage(err), "error");
      return false;
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const prev = tasks;
    setData(tasks.filter((t) => t.id !== task.id));
    try {
      await api(`/tasks/${task.id}`, { method: "DELETE" });
      toast("Task deleted");
    } catch (err) {
      setData(prev);
      toast(errorMessage(err), "error");
    }
  }

  return (
    <Page>
      <PageHeader title="Tasks" description="Every task needs an owner, a due date and a priority, so nothing falls through the cracks." />

      {/* Add task */}
      <Card className="p-4">
        <form onSubmit={addTask} noValidate className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <label htmlFor="task-title" className="sr-only">Task title</label>
          <input
            id="task-title"
            className={cn(inputClass, "lg:flex-1", formTouched && formProblems.title && "border-amber-400")}
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] lg:flex">
            <label htmlFor="task-owner" className="sr-only">Owner</label>
            <input
              id="task-owner"
              className={cn(inputClass, "lg:w-36", formTouched && formProblems.owner && "border-amber-400")}
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <label htmlFor="task-priority" className="sr-only">Priority</label>
            <select
              id="task-priority"
              className={cn(inputClass, "lg:w-36", !priority && "text-zinc-400", formTouched && formProblems.priority && "border-amber-400")}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Priority…</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <label htmlFor="task-date" className="sr-only">Due date</label>
            <input
              id="task-date"
              type="date"
              min={todayIso()}
              className={cn(inputClass, "lg:w-40", formTouched && formProblems.deadline && "border-amber-400")}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Button type="submit" loading={saving} className="whitespace-nowrap">
              {!saving && <PlusIcon width={16} height={16} />} Add task
            </Button>
          </div>
        </form>
        {formError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
            <AlertIcon width={14} height={14} /> {formError}
          </p>
        )}
      </Card>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-sm" role="tablist">
          {STATUS_FILTERS.filter((f) => f.value !== "needs-details" || counts["needs-details"] > 0).map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                statusFilter === f.value
                  ? f.value === "needs-details"
                    ? "bg-amber-500 text-white"
                    : "bg-zinc-900 text-white"
                  : f.value === "needs-details"
                    ? "text-amber-700 hover:bg-amber-50"
                    : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {f.label}
              <span className={cn("text-xs", statusFilter === f.value ? "text-white/70" : "text-zinc-400")}>{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              aria-label="Search tasks"
              className={cn(inputClass, "pl-9")}
              placeholder="Search tasks or owners"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="w-36 shrink-0">
            <select aria-label="Filter by priority" className={inputClass} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">Any priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <Card className="mt-4">
        {error ? (
          <ErrorState message={error} onRetry={reload} className="m-4" />
        ) : loading ? (
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<CheckSquareIcon />}
            title={tasks.length ? "No tasks match your filters" : "No tasks yet"}
            description={tasks.length ? "Try a different filter or search." : "Add one above, or extract tasks from your meeting notes."}
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map((task) => {
              const isDone = task.status === "done";
              const gaps = legacyTaskGaps(task);
              const editing = editingId === task.id;
              return (
                <li key={task.id} className="group px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateTask(task, { status: isDone ? "todo" : "done" })}
                      aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition cursor-pointer",
                        isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"
                      )}
                    >
                      <CheckIcon width={12} height={12} strokeWidth={3} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", isDone ? "text-zinc-400 line-through" : "text-zinc-900")}>{task.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        {known(task.owner) && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon width={12} height={12} /> {task.owner}
                          </span>
                        )}
                        {known(task.deadline) && (
                          <span className={cn("inline-flex items-center gap-1", !isIsoDate(task.deadline) && "text-amber-700")}>
                            <CalendarIcon width={12} height={12} /> {formatDate(task.deadline)}
                          </span>
                        )}
                        {gaps.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setEditingId(task.id)}
                            className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline cursor-pointer"
                          >
                            <AlertIcon width={12} height={12} /> Needs {gaps.join(" & ")}
                          </button>
                        )}
                        {task.priority && (
                          <span className="sm:hidden">
                            <Badge tone={priorityTone(task.priority)}>{capitalize(task.priority)}</Badge>
                          </span>
                        )}
                      </div>
                    </div>

                    {task.priority && (
                      <span className="hidden sm:block">
                        <Badge tone={priorityTone(task.priority)}>{capitalize(task.priority)}</Badge>
                      </span>
                    )}

                    <select
                      aria-label={`Status of "${task.title}"`}
                      value={task.status}
                      onChange={(e) => updateTask(task, { status: e.target.value })}
                      className={cn(
                        "rounded-md border-0 py-1 pl-2 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer",
                        STATUS_SELECT_STYLE[task.status] ?? STATUS_SELECT_STYLE.todo
                      )}
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <div className="flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <IconButton label={`Edit "${task.title}"`} onClick={() => setEditingId(editing ? null : task.id)}>
                        <PencilIcon width={16} height={16} />
                      </IconButton>
                      <IconButton label={`Delete "${task.title}"`} variant="danger" onClick={() => deleteTask(task)}>
                        <TrashIcon width={16} height={16} />
                      </IconButton>
                    </div>
                  </div>

                  {editing && (
                    <TaskEditor
                      initial={{
                        title: task.title,
                        owner: known(task.owner) ? task.owner : "",
                        deadline: isIsoDate(task.deadline) ? task.deadline : "",
                        priority: task.priority ?? "",
                      }}
                      onCancel={() => setEditingId(null)}
                      onSave={async (v) => {
                        const ok = await updateTask(task, {
                          title: v.title.trim(),
                          owner: v.owner.trim(),
                          deadline: v.deadline,
                          priority: v.priority,
                        });
                        if (ok) {
                          setEditingId(null);
                          toast("Task updated");
                        }
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}
