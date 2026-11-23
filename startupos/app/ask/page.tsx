"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button, IconButton, Markdown } from "@/components/ui";
import { AlertIcon, BotIcon, ChatIcon, RefreshIcon, SendIcon } from "@/components/icons";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What are our current blockers?",
  "What should we focus on this week?",
  "What decisions have we made?",
  "Which high-priority tasks are still open?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; question: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  // Grow the composer with its content, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const history = messages;
    setMessages([...history, { role: "user", content: q }]);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ answer: string }>("/ask", {
        method: "POST",
        body: JSON.stringify({ text: q, history }),
      });
      setMessages([...history, { role: "user", content: q }, { role: "assistant", content: data.answer }]);
    } catch (e) {
      // Take the unanswered question back out so history stays in user/assistant pairs.
      setMessages(history);
      setError({ message: errorMessage(e), question: q });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
  }

  const empty = messages.length === 0 && !loading && !error;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Ask StartupOS</h1>
            <p className="text-xs text-zinc-500">Answers come from your tasks, blockers, decisions and documents.</p>
          </div>
          {messages.length > 0 && (
            <Button variant="secondary" size="sm" onClick={newChat}>
              <RefreshIcon width={14} height={14} /> New chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
          {empty && (
            <div className="flex flex-col items-center pt-8 text-center sm:pt-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                <ChatIcon />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-zinc-900">What would you like to know?</h2>
              <p className="mt-1 max-w-md text-sm text-zinc-500">
                Ask anything about your startup&apos;s progress. Follow-up questions keep the context.
              </p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="fade-up flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="fade-up flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
                  <BotIcon width={16} height={16} />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <Markdown>{m.content}</Markdown>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
                <BotIcon width={16} height={16} />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-4 py-4 shadow-sm" aria-label="Thinking">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="typing-dot h-2 w-2 rounded-full bg-zinc-400" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertIcon className="mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="font-medium">Couldn&apos;t answer “{error.question}”</p>
                <p className="mt-0.5 text-red-700">{error.message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => send(error.question)} className="text-red-700 hover:bg-red-100">
                Retry
              </Button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200 bg-white">
        <form
          className="mx-auto max-w-3xl px-4 py-4 sm:px-8"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <label htmlFor="ask-input" className="sr-only">Your question</label>
            <textarea
              id="ask-input"
              ref={inputRef}
              rows={1}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask anything about your startup…"
              className="max-h-44 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <IconButton
              type="submit"
              label="Send"
              variant="primary"
              disabled={!input.trim() || loading}
              className={cn("h-9 w-9 rounded-xl")}
            >
              <SendIcon width={16} height={16} />
            </IconButton>
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">Enter to send · Shift + Enter for a new line</p>
        </form>
      </div>
    </div>
  );
}
