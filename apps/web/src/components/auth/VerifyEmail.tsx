"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { messageOf, postJson } from "./post-json";

/** The link only opens this page; nothing changes until the button is pressed (links get prefetched). */
export function VerifyEmail({ token }: Readonly<{ token: string }>) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string>();

  async function confirm() {
    setState("busy");
    setError(undefined);
    const result = await postJson("/api/auth/verify-email", { token });
    if (result.ok) setState("done");
    else {
      setError(messageOf(result));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="grid gap-5">
        <p className="flex items-center gap-2 text-[17px] font-medium text-leaf">
          <Check aria-hidden className="size-5" /> Your email is confirmed.
        </p>
        <Link
          href="/sign-in"
          className="flex min-h-14 items-center justify-center rounded-m bg-primary px-6 text-base font-semibold text-on-primary hover:bg-primary-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      <Button size="lg" block disabled={state === "busy"} onClick={confirm}>
        Confirm my email
      </Button>
    </div>
  );
}
