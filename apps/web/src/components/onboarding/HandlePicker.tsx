"use client";

import { Check, LoaderCircle } from "lucide-react";
import { CircleRing } from "@/components/CircleRing";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";
import { normalizeUsername, suggestUsernames } from "@/lib/username";
import type { UsernameCheck } from "./useUsernameCheck";

type Props = Readonly<{
  displayName: string;
  photos: readonly string[];
  value: string;
  onChange: (value: string) => void;
  check: UsernameCheck;
}>;

/** Where the person's own bead sits among the seven others. */
const YOU = 3;

/** The handle shrinks as it grows, so even twenty characters stay inside the circle. */
const sizeFor = (length: number) =>
  length <= 8
    ? "text-[22px]"
    : length <= 11
      ? "text-[17px]"
      : length <= 14
        ? "text-[14px]"
        : length <= 17
          ? "text-[12px]"
          : "text-[10px]";

/**
 * Choosing a handle, shown as taking a seat: the person's own bead joins a circle of seven photos and
 * their handle appears at its heart as they type. Whether it is free is told in words under the field.
 */
export function HandlePicker({ displayName, photos, value, onChange, check }: Props) {
  const name = normalizeUsername(value);
  const ideas = suggestUsernames(displayName).filter((idea) => idea !== name);
  const showIdeas = (check.phase === "idle" || check.phase === "taken") && ideas.length > 0;

  return (
    <div className="grid gap-5">
      <div className={cn("relative mx-auto w-[220px]", check.phase === "available" && "pop")}>
        <CircleRing
          size={220}
          you={YOU}
          title="Your seat in the circle"
          members={SAMPLE_CIRCLE.map((member, i) =>
            i === YOU
              ? { name: displayName || "You", status: "pending" as const }
              : { name: member.name, status: "paid" as const, photo: photos[i] },
          )}
        />
        <div
          aria-hidden="true"
          data-testid="handle-heart"
          className="pointer-events-none absolute inset-x-[21%] inset-y-[27%] grid place-items-center text-center"
        >
          <div className="grid gap-1">
            <span className="text-[9px] font-semibold tracking-[0.06em] text-ink-muted">
              YOUR HANDLE
            </span>
            <span
              className={cn(
                "font-display leading-tight font-bold break-all",
                sizeFor(name.length + 1),
                name ? "text-primary" : "text-ink-muted/60",
              )}
            >
              @{name || "yourname"}
            </span>
          </div>
        </div>
      </div>

      <TextField
        label="Username"
        prefix="@"
        value={value}
        onChange={onChange}
        placeholder="e.g. ada_ola"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={21}
        error={check.phase === "invalid" ? check.message : undefined}
        hint={
          check.phase === "idle"
            ? "Friends will find you by this. It's hard to change later."
            : undefined
        }
      />

      <div role="status" aria-live="polite" className="-mt-2 min-h-5 text-[14px] font-medium">
        {check.phase === "checking" && (
          <p className="flex items-center gap-1.5 text-ink-muted">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Checking…
          </p>
        )}
        {check.phase === "available" && (
          <p className="flex items-center gap-1.5 text-leaf">
            <Check aria-hidden className="size-4" strokeWidth={3} />@{name} is yours to take.
          </p>
        )}
        {check.phase === "taken" && (
          <p className="text-danger">@{name} is taken. Try one of these:</p>
        )}
        {check.phase === "error" && (
          <p className="text-ink-muted">
            We couldn&apos;t check just now. You can carry on, and we&apos;ll confirm when you save.
          </p>
        )}
      </div>

      {showIdeas && (
        <div role="group" aria-label="Ideas" className="-mt-2 flex flex-wrap gap-2">
          {check.phase === "idle" && (
            <p className="w-full text-[13px] font-semibold text-ink-muted">Need an idea?</p>
          )}
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => onChange(idea)}
              className="min-h-11 rounded-full border-[1.5px] border-line bg-surface-raised px-4 text-[15px] font-semibold text-primary transition-colors hover:bg-primary-tint"
            >
              @{idea}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
