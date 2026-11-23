"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import Sidebar, { Logo } from "./sidebar";
import { buttonClass, Spinner } from "./ui";
import { AlertIcon } from "./icons";

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PAGES = ["/", ...AUTH_PAGES];

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-6">{children}</div>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { status, error, retry, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isPublic = PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    if (status === "anon" && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authed" && isAuthPage) {
      const next = new URLSearchParams(window.location.search).get("next");
      // Only follow same-site paths, never an outside URL.
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    }
  }, [status, isPublic, isAuthPage, pathname, router]);

  // Login / signup: no sidebar.
  if (isAuthPage) {
    return status === "authed" ? (
      <FullScreen>
        <Spinner className="h-6 w-6 text-zinc-400" />
      </FullScreen>
    ) : (
      <>{children}</>
    );
  }

  if (status === "authed") {
    return (
      <div className="lg:flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          {user?.is_demo && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-center text-sm text-indigo-900">
              <span>
                <span className="font-semibold">Demo workspace</span>{" "}with sample data. It&apos;s private to you and deleted after 24 hours.
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  // Full page load so the login redirect for protected pages can't race this.
                  window.location.assign("/signup");
                }}
                className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-500 cursor-pointer"
              >
                Create your own account
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    );
  }

  if (status === "error") {
    return (
      <FullScreen>
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertIcon />
          </div>
          <p className="mt-3 font-semibold text-zinc-900">Can&apos;t connect</p>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
          <button type="button" onClick={retry} className={buttonClass("secondary", "md", "mt-5")}>
            Try again
          </button>
        </div>
      </FullScreen>
    );
  }

  // Logged-out visitors can still see the landing page.
  if (pathname === "/" && status === "anon") {
    return (
      <>
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-8">
            <Logo />
            <div className="flex gap-2">
              <Link href="/login" className={buttonClass("ghost")}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClass("primary")}>
                Sign up
              </Link>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </>
    );
  }

  return (
    <FullScreen>
      <Spinner className="h-6 w-6 text-zinc-400" />
    </FullScreen>
  );
}
