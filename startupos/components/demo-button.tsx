"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "./toast";
import { Button } from "./ui";
import { SparklesIcon } from "./icons";

/** One click into a private workspace full of sample data, no sign-up needed. */
export default function DemoButton({
  className,
  label = "Try the demo",
  variant = "secondary",
}: {
  className?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const { startDemo } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant={variant}
      loading={loading}
      className={className}
      onClick={async () => {
        setLoading(true);
        try {
          await startDemo();
          router.push("/dashboard");
        } catch (e) {
          toast(errorMessage(e), "error");
          setLoading(false);
        }
      }}
    >
      {!loading && <SparklesIcon width={16} height={16} />} {label}
    </Button>
  );
}
