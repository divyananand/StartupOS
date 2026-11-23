"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { buttonClass } from "./ui";
import { ArrowRightIcon, SparklesIcon } from "./icons";

export default function HomeCtas() {
  const { status } = useAuth();
  const authed = status === "authed";
  return (
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <Link href={authed ? "/extract" : "/signup"} className={buttonClass("primary", "md", "h-11 px-5")}>
        <SparklesIcon /> {authed ? "Extract from notes" : "Get started free"}
      </Link>
      <Link href={authed ? "/dashboard" : "/login"} className={buttonClass("secondary", "md", "h-11 px-5")}>
        {authed ? "Open dashboard" : "Log in"} <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
}
