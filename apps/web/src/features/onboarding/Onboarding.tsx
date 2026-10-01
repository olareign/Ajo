"use client";

import { PiggyBank, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const SLIDES = [
  {
    title: "Save money to achieve your goals",
    body: "Start individual savings to achieve both your long and short term goals.",
    Icon: PiggyBank,
  },
  {
    title: "Save money in groups with family and friends.",
    body: "Save money in groups and collect in turns. This helps achieve your financial goals quicker.",
    Icon: UsersRound,
  },
] as const;

const primaryLink =
  "flex h-12 w-full items-center justify-center rounded-field bg-brand-600 font-medium text-white hover:bg-brand-700";

export function Onboarding() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-6 pb-8">
      <div className="flex justify-end">
        <Link href="/groups" className="p-2 font-semibold text-ink">
          Skip
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-12 flex size-56 items-center justify-center rounded-full bg-brand-50">
          <slide.Icon aria-hidden className="size-28 text-brand-600" strokeWidth={1.25} />
        </div>
        <h1 className="mb-4 max-w-72 text-2xl font-bold text-brand-600">{slide.title}</h1>
        <p className="max-w-80 text-sm text-ink-muted">{slide.body}</p>

        <div role="tablist" aria-label="Introduction" className="mt-10 flex gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-8 bg-brand-600" : "w-1.5 bg-line",
              )}
            />
          ))}
        </div>
      </div>

      {last ? (
        <Link href="/savings/new" className={primaryLink}>
          Get Started
        </Link>
      ) : (
        <Button onClick={() => setIndex(index + 1)}>Next</Button>
      )}
    </div>
  );
}
