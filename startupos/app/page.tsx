import Link from "next/link";
import { Page } from "@/components/ui";
import HomeCtas from "@/components/home-ctas";
import {
  ArrowRightIcon,
  BotIcon,
  ChatIcon,
  CheckSquareIcon,
  FileIcon,
  GridIcon,
  ReportIcon,
  SparklesIcon,
} from "@/components/icons";

const steps = [
  {
    icon: SparklesIcon,
    title: "Paste your meeting notes",
    desc: "Drop in raw, messy notes from any standup, planning or investor call.",
  },
  {
    icon: CheckSquareIcon,
    title: "AI organises everything",
    desc: "Tasks, owners, deadlines, blockers and decisions are pulled out and saved.",
  },
  {
    icon: ChatIcon,
    title: "Ask, track and report",
    desc: "Ask questions in plain English and get a weekly report in one click.",
  },
];

const features = [
  { href: "/dashboard", icon: GridIcon, title: "Dashboard", desc: "See progress, blockers and decisions at a glance." },
  { href: "/tasks", icon: CheckSquareIcon, title: "Tasks", desc: "Track work by status and priority, update it inline." },
  { href: "/documents", icon: FileIcon, title: "Documents", desc: "Keep pitch decks, SOPs and briefs in one place." },
  { href: "/extract", icon: SparklesIcon, title: "Extract", desc: "Turn meeting notes into structured work automatically." },
  { href: "/ask", icon: ChatIcon, title: "Ask", desc: "Chat with your company data and get specific answers." },
  { href: "/report", icon: ReportIcon, title: "Reports", desc: "Generate a weekly execution report with Claude." },
];

export default function HomePage() {
  return (
    <Page className="max-w-5xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-2xl rounded-full bg-linear-to-r from-indigo-200 via-violet-200 to-sky-200 opacity-50 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <BotIcon width={14} height={14} /> Powered by Claude
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Turn messy meetings into a clear plan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 sm:text-lg">
            StartupOS is the AI operating system for early-stage teams. It tracks your tasks, blockers and
            decisions for you, so you can focus on building.
          </p>
          <HomeCtas />
        </div>
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <step.icon />
                </span>
                <span className="text-xs font-semibold text-zinc-400">Step {i + 1}</span>
              </div>
              <p className="mt-4 font-semibold text-zinc-900">{step.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Everything in one place</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <f.icon className="text-zinc-400 transition-colors group-hover:text-indigo-600" />
              <p className="mt-3 flex items-center gap-1 font-semibold text-zinc-900">
                {f.title}
                <ArrowRightIcon
                  width={14}
                  height={14}
                  className="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                />
              </p>
              <p className="mt-1 text-sm text-zinc-500">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </Page>
  );
}
