"use client";

import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import DemoButton from "./demo-button";
import { Logo } from "./sidebar";
import { Button, Field, inputClass } from "./ui";
import { AlertIcon } from "./icons";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const passwordTooShort = isSignup && password.length > 0 && password.length < 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordTooShort) return;
    setError(null);
    setLoading(true);
    try {
      if (isSignup) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      // AppShell sends you on to the dashboard (or the page you came from).
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-zinc-900">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isSignup ? "Your workspace is private to you." : "Log in to your StartupOS workspace."}
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            {isSignup && (
              <Field label="Name" htmlFor="name">
                <input
                  id="name"
                  className={inputClass}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                className={inputClass}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isSignup}
              />
            </Field>
            <Field label="Password" htmlFor="password" hint={isSignup ? "At least 8 characters." : undefined}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={cn(inputClass, "pr-16", passwordTooShort && "border-amber-400")}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isSignup ? 8 : undefined}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={loading} className="mt-2 w-full">
              {isSignup ? "Create account" : "Log in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" /> or <span className="h-px flex-1 bg-zinc-200" />
          </div>
          <DemoButton className="w-full" label="Explore a demo workspace" />
          <p className="mt-2 text-center text-xs text-zinc-400">Sample data, no sign-up. Deleted after 24 hours.</p>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {isSignup ? "Already have an account? " : "New to StartupOS? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-indigo-600 hover:text-indigo-500">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
