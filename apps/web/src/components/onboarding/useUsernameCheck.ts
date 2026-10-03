"use client";

import { useEffect, useState } from "react";
import { normalizeUsername, usernameProblem } from "@/lib/username";

export const DEBOUNCE_MS = 450;

export type UsernameCheck =
  | Readonly<{ phase: "idle" }>
  | Readonly<{ phase: "invalid"; message: string }>
  | Readonly<{ phase: "checking" }>
  | Readonly<{ phase: "available" }>
  | Readonly<{ phase: "taken" }>
  | Readonly<{ phase: "error" }>;

type Answer = Readonly<{ name: string; outcome: "available" | "taken" | "error" }>;

/**
 * Whether a typed username is free, checked once the person pauses. A name that cannot work is
 * explained without asking the server; an answer about an earlier name never replaces the current
 * one. `knownTaken` holds names the server already refused at save time.
 */
export function useUsernameCheck(value: string, knownTaken: readonly string[] = []): UsernameCheck {
  const name = normalizeUsername(value);
  const problem = usernameProblem(value);
  const [answer, setAnswer] = useState<Answer>();

  useEffect(() => {
    if (!name || problem) return;
    let live = true;
    const timer = setTimeout(async () => {
      let outcome: Answer["outcome"] = "error";
      try {
        const res = await fetch(`/api/me/username/available?username=${name}`, {
          credentials: "same-origin",
        });
        if (res.ok) {
          const body = (await res.json()) as { available?: unknown };
          if (typeof body.available === "boolean") {
            outcome = body.available ? "available" : "taken";
          }
        }
      } catch {
        // stays "error": the save will say for certain
      }
      if (live) setAnswer({ name, outcome });
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [name, problem]);

  if (!name) return { phase: "idle" };
  if (problem) return { phase: "invalid", message: problem };
  if (knownTaken.includes(name)) return { phase: "taken" };
  if (answer?.name !== name) return { phase: "checking" };
  return { phase: answer.outcome };
}
