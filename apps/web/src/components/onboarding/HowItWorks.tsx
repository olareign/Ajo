"use client";

import { useState, type ReactNode, type TouchEvent } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CircleScene } from "./scenes/CircleScene";
import { SoloScene } from "./scenes/SoloScene";
import { TrustScene } from "./scenes/TrustScene";

type Props = Readonly<{
  /** Member photos for the example circle (public/people); a silhouette stands in for any missing. */
  photos: readonly string[];
  /** Called when the person reaches the end or skips. */
  onFinish: () => void;
}>;

type Slide = Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Tint behind the scene. */
  panel: string;
  scene: (photos: readonly string[]) => ReactNode;
}>;

const SLIDES: readonly Slide[] = [
  {
    id: "solo",
    eyebrow: "Solo savings",
    title: "Save on your own, without thinking about it",
    body: "Choose an amount, how often and for how long. Deposits happen by themselves, and the money is yours at the end.",
    panel: "bg-primary-tint",
    scene: () => <SoloScene />,
  },
  {
    id: "circle",
    eyebrow: "Èsúsú circles",
    title: "Save together, take turns",
    body: "Everyone in a circle pays the same amount each round. Each round, the whole pot goes to one person, until everyone has had their turn.",
    panel: "bg-oro-tint",
    scene: (photos) => <CircleScene photos={photos} />,
  },
  {
    id: "trust",
    eyebrow: "Built on trust",
    title: "Everyone is checked",
    body: "Every member is identity-verified. Newer members lock a deposit that covers a missed payment, so the pot always arrives in full.",
    panel: "bg-tertiary-tint",
    scene: () => <TrustScene />,
  },
];

/** A swipe must travel this far sideways, and more sideways than up or down, to count. */
const SWIPE_DISTANCE = 50;

/**
 * Three short scenes that show how Àjọ works before any question is asked: saving alone, a circle
 * taking turns, and why it can be trusted. Each is a picture for the eye with the same message in
 * words for everyone else; each can be skipped, and the whole thing can be swiped.
 */
export function HowItWorks({ photos, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [touchStart, setTouchStart] = useState<{ x: number; y: number }>();
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index]!;

  function go(to: number) {
    if (to < 0 || to >= SLIDES.length) return;
    setDirection(to > index ? "forward" : "back");
    setIndex(to);
  }

  function onTouchEnd(event: TouchEvent) {
    const end = event.changedTouches[0];
    if (!touchStart || !end) return;
    const dx = end.clientX - touchStart.x;
    const dy = end.clientY - touchStart.y;
    setTouchStart(undefined);
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;
    go(index + (dx < 0 ? 1 : -1));
  }

  return (
    <main
      aria-roledescription="carousel"
      aria-label="How Àjọ works"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <Logo width={76} />
        <Button variant="quiet" onClick={onFinish}>
          Skip
        </Button>
      </div>
      <div
        data-testid="swipe-area"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) setTouchStart({ x: t.clientX, y: t.clientY });
        }}
        onTouchEnd={onTouchEnd}
        className="flex flex-1 flex-col"
      >
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${SLIDES.length}`}
          className={cn(
            "flex flex-1 flex-col",
            direction === "forward" ? "slide-from-right" : "slide-from-left",
          )}
        >
          <div
            data-scene={slide.id}
            aria-hidden="true"
            className={cn(
              "grid h-[clamp(288px,36dvh,320px)] place-items-center overflow-hidden rounded-[var(--radius-l)]",
              slide.panel,
            )}
          >
            {slide.scene(photos)}
          </div>
          <div className="mt-7 grid gap-3">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-tertiary">
              {slide.eyebrow}
            </p>
            <h1 className="font-display text-[30px] leading-9 font-bold tracking-[-0.015em] text-balance text-primary">
              {slide.title}
            </h1>
            <p className="text-[17px] leading-[26px] text-ink-muted">{slide.body}</p>
          </div>
        </div>
      </div>
      {/* Pinned to the bottom of the screen: on a short phone the words scroll, the button never leaves. */}
      <div className="sticky bottom-0 -mx-4 mt-6 grid gap-4 bg-surface px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <ol aria-hidden="true" className="flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-300",
                i === index ? "w-6 bg-primary" : "w-2 bg-line-strong/40",
              )}
            />
          ))}
        </ol>
        <div className={cn("grid gap-3", index > 0 && "grid-cols-[auto_1fr]")}>
          {index > 0 && (
            <Button variant="quiet" size="lg" onClick={() => go(index - 1)}>
              Back
            </Button>
          )}
          <Button size="lg" block onClick={() => (last ? onFinish() : go(index + 1))}>
            {last ? "Let's set you up" : "Next"}
          </Button>
        </div>
      </div>
    </main>
  );
}
