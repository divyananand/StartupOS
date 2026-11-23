"use client";

import { useMemo, useState } from "react";
import { api, errorMessage, useApi } from "@/lib/api";
import type { Doc } from "@/lib/types";
import { cn, timeAgo, type Tone } from "@/lib/utils";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  inputClass,
  Page,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { FileIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";

const DOC_TYPES: { value: string; label: string; tone: Tone }[] = [
  { value: "pitch-deck", label: "Pitch deck", tone: "indigo" },
  { value: "sop", label: "SOP", tone: "blue" },
  { value: "brief", label: "Brief", tone: "amber" },
  { value: "notes", label: "Notes", tone: "green" },
  { value: "other", label: "Other", tone: "gray" },
];

function typeInfo(value: string) {
  return DOC_TYPES.find((t) => t.value === value) ?? { value, label: value, tone: "gray" as Tone };
}

function DocCard({ doc, onDelete }: { doc: Doc; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const long = doc.content.length > 280 || doc.content.split("\n").length > 4;
  const t = typeInfo(doc.doc_type);
  return (
    <Card className="group p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900">{doc.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={t.tone}>{t.label}</Badge>
            {doc.created_at && <span className="text-xs text-zinc-400">{timeAgo(doc.created_at)}</span>}
          </div>
        </div>
        <IconButton
          label={`Delete "${doc.title}"`}
          variant="danger"
          onClick={onDelete}
          className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <TrashIcon width={16} height={16} />
        </IconButton>
      </div>
      {doc.content && (
        <>
          <p className={cn("mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600", !expanded && "line-clamp-4")}>
            {doc.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

export default function DocumentsPage() {
  const { data, setData, error, loading, reload } = useApi<Doc[]>("/documents");
  const docs = useMemo(() => data ?? [], [data]);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("pitch-deck");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...docs]
      .reverse()
      .filter((d) => typeFilter === "all" || d.doc_type === typeFilter)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
  }, [docs, query, typeFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await api<Doc>("/documents", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), doc_type: docType, content }),
      });
      setData([...docs, created]);
      setTitle("");
      setContent("");
      toast("Document saved");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!window.confirm(`Delete “${doc.title}”?`)) return;
    const prev = docs;
    setData(docs.filter((d) => d.id !== doc.id));
    try {
      await api(`/documents/${doc.id}`, { method: "DELETE" });
      toast("Document deleted");
    } catch (err) {
      setData(prev);
      toast(errorMessage(err), "error");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Documents"
        description="Store pitch decks, SOPs and briefs. The Ask assistant reads them when answering your questions."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-6">
          <CardHeader title="New document" icon={<PlusIcon width={16} height={16} />} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <Field label="Title" htmlFor="doc-title">
              <input
                id="doc-title"
                className={inputClass}
                placeholder="e.g. Seed round pitch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field label="Type" htmlFor="doc-type">
              <select id="doc-type" className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Content" htmlFor="doc-content">
              <textarea
                id="doc-content"
                className={cn(inputClass, "min-h-40 resize-y")}
                placeholder="Paste or write the document content…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" loading={saving}>
              Save document
            </Button>
          </form>
        </Card>

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                aria-label="Search documents"
                className={cn(inputClass, "pl-9")}
                placeholder="Search documents"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "all", label: "All" }, ...DOC_TYPES].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypeFilter(t.value)}
                  aria-pressed={typeFilter === t.value}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    typeFilter === t.value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FileIcon />}
                title={docs.length ? "No documents match" : "No documents yet"}
                description={docs.length ? "Try a different search or type." : "Create your first document with the form."}
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((doc) => (
                <DocCard key={doc.id} doc={doc} onDelete={() => deleteDoc(doc)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
