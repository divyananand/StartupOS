"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import DemoButton from "./demo-button";
import { buttonClass } from "./ui";
import { ArrowRightIcon, SparklesIcon } from "./icons";

export default function HomeCtas() {
  const { status } = useAuth();

  if (status === "authed") {
    return (
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/extract" className={buttonClass("primary", "md", "h-11 px-5")}>
          <SparklesIcon /> Extract from notes
        </Link>
        <Link href="/dashboard" className={buttonClass("secondary", "md", "h-11 px-5")}>
          Open dashboard <ArrowRightIcon width={16} height={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
        <DemoButton variant="primary" className="h-11 px-5" label="Try the live demo" />
        <Link href="/signup" className={buttonClass("secondary", "md", "h-11 px-5")}>
          Create a free account <ArrowRightIcon width={16} height={16} />
        </Link>
      </div>
      <p className="text-xs text-zinc-500">The demo opens a private workspace with sample data. No sign-up needed.</p>
    </div>
  );
}
