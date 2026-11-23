"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LogoutIcon,
  BotIcon,
  ChatIcon,
  CheckSquareIcon,
  FileIcon,
  GridIcon,
  HomeIcon,
  MenuIcon,
  ReportIcon,
  SparklesIcon,
  XIcon,
} from "./icons";

type NavItem = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/", label: "Home", icon: HomeIcon },
      { href: "/dashboard", label: "Dashboard", icon: GridIcon },
      { href: "/tasks", label: "Tasks", icon: CheckSquareIcon },
      { href: "/documents", label: "Documents", icon: FileIcon },
    ],
  },
  {
    title: "AI",
    items: [
      { href: "/extract", label: "Extract", icon: SparklesIcon },
      { href: "/ask", label: "Ask", icon: ChatIcon },
      { href: "/report", label: "Reports", icon: ReportIcon },
      { href: "/agents", label: "Workflows", icon: BotIcon },
    ],
  },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
        S
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">StartupOS</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                  >
                    <Icon className={active ? "text-indigo-600" : "text-zinc-400"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function AccountCard() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {initials(user.name) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
      >
        <LogoutIcon width={16} height={16} />
      </button>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
        >
          <MenuIcon />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setOpen(false)} />
          <div className="drawer-in absolute inset-y-0 left-0 flex w-72 flex-col gap-8 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <XIcon />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <AccountCard />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r border-zinc-200 bg-white px-3 py-5 lg:flex">
        <div className="px-3">
          <Logo />
        </div>
        <NavLinks />
        <div className="mt-auto">
          <AccountCard />
        </div>
      </aside>
    </>
  );
}
