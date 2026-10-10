"use client";

import { Bell, BellRing, Coins, Orbit, PiggyBank, TriangleAlert, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { loadNotices, readAllNotices, readNotice, type Notice } from "@/lib/savings-client";
import { recall, remember } from "@/lib/visit-cache";
import { whenText } from "@/lib/when";

export function NotificationsScreen() {
  return <MeGate needs="onboarded">{() => <Messages />}</MeGate>;
}

type State =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "failed" }>
  | Readonly<{
      phase: "ready";
      items: readonly Notice[];
      next: string | null;
      unread: number;
      moreFailed: boolean;
    }>;

/** An icon and a colour for each kind of message: warnings warm, money good news green, reminders indigo. */
function look(kind: string) {
  if (/missed|short|failed|default|reversed/.test(kind))
    return { Icon: TriangleAlert, tone: "bg-danger-tint text-danger" };
  if (/matured|paid|created|payout/.test(kind))
    return { Icon: PiggyBank, tone: "bg-leaf-tint text-leaf" };
  if (/soon|reminder/.test(kind)) return { Icon: BellRing, tone: "bg-tertiary-tint text-tertiary" };
  if (kind.startsWith("friend.")) return { Icon: UserCheck, tone: "bg-primary-tint text-primary" };
  if (kind.startsWith("group.")) return { Icon: Orbit, tone: "bg-tertiary-tint text-tertiary" };
  return { Icon: Coins, tone: "bg-oro-tint text-oro-ink" };
}

/** Today's messages first, then the rest, so what just happened is where the eye lands. */
function byDay(items: readonly Notice[], now: Date = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = items.filter((i) => new Date(i.createdAt) >= start);
  const earlier = items.filter((i) => new Date(i.createdAt) < start);
  return [
    { title: "Today", items: today },
    { title: "Earlier", items: earlier },
  ].filter((g) => g.items.length > 0);
}

function Messages() {
  const router = useRouter();
  // Within a visit the last copy shows at once while a fresh one loads.
  const [state, setState] = useState<State>(
    () => recall<State>("screen:messages") ?? { phase: "loading" },
  );
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadNotices();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setState((was) => (was.phase === "ready" ? was : { phase: "failed" }));
      }
      const next: State = {
        phase: "ready",
        items: result.data.items,
        next: result.data.next,
        unread: result.data.unread,
        moreFailed: false,
      };
      remember("screen:messages", next);
      setState(next);
    })();
    return () => {
      live = false;
    };
  }, [router, attempt]);

  async function more() {
    if (state.phase !== "ready" || !state.next) return;
    setLoadingMore(true);
    const result = await loadNotices(state.next);
    if (!mounted.current) return;
    setLoadingMore(false);
    setState((s) => {
      if (s.phase !== "ready") return s;
      if (!result.ok) return { ...s, moreFailed: true };
      return {
        ...s,
        items: [...s.items, ...result.data.items],
        next: result.data.next,
        moreFailed: false,
      };
    });
  }

  function open(item: Notice) {
    if (!item.readAt) {
      // Marked in the background: opening the message never waits for it.
      void readNotice(item.id);
      setState((s) =>
        s.phase === "ready"
          ? {
              ...s,
              unread: Math.max(0, s.unread - 1),
              items: s.items.map((i) =>
                i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
              ),
            }
          : s,
      );
    }
    if (item.link) router.push(item.link);
  }

  async function readAll() {
    await readAllNotices();
    setState((s) =>
      s.phase === "ready"
        ? {
            ...s,
            unread: 0,
            items: s.items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
          }
        : s,
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28 lg:max-w-3xl lg:pt-8 lg:pb-12">
      <ScreenHeader title="Messages" backHref="/today" />
      {state.phase === "loading" && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {state.phase === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your messages. Check your connection and try again.
          </p>
          <Button
            onClick={() => {
              setState({ phase: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {state.phase === "ready" && state.items.length === 0 && (
        <div className="grid justify-items-center gap-3 rounded-[var(--radius-xl)] bg-surface-raised p-8 text-center shadow-lift">
          <span className="grid size-16 place-items-center rounded-full bg-primary-tint text-primary">
            <Bell aria-hidden className="size-8" />
          </span>
          <p className="font-display text-[20px] font-semibold">Nothing yet</p>
          <p className="text-[15px] text-ink-muted">
            Reminders and results from your plans will show up here.
          </p>
        </div>
      )}
      {state.phase === "ready" && state.items.length > 0 && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] text-ink-muted" aria-live="polite">
              {state.unread === 0 ? "All read" : `${state.unread} unread`}
            </p>
            {state.unread > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="rounded-s px-2 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          {byDay(state.items).map((group) => (
            <section key={group.title} aria-label={group.title} className="grid gap-2">
              <h2 className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted uppercase">
                {group.title}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
                {group.items.map((item) => {
                  const { Icon, tone } = look(item.kind);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => open(item)}
                        data-unread={item.readAt ? undefined : ""}
                        className={cn(
                          "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-sunken",
                          !item.readAt && "bg-primary-tint/40",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-full",
                            item.readAt ? "bg-surface-sunken text-ink-muted" : tone,
                          )}
                        >
                          <Icon aria-hidden className="size-5" />
                        </span>
                        <span className="grid min-w-0 grow gap-0.5">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "text-[15px] leading-6",
                                item.readAt ? "font-medium" : "font-semibold",
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-2 pt-1 text-[12px] text-ink-muted">
                              {whenText(item.createdAt)}
                              {!item.readAt && (
                                <span
                                  className="size-2 shrink-0 rounded-full bg-oro"
                                  role="img"
                                  aria-label="Unread"
                                />
                              )}
                            </span>
                          </span>
                          <span className="text-[14px] leading-5 text-ink-muted">{item.body}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {state.moreFailed && (
            <p role="alert" className="text-center text-[15px] text-danger">
              We couldn&apos;t load more.
            </p>
          )}
          {state.next && (
            <Button
              variant="quiet"
              loading={loadingMore}
              disabled={loadingMore}
              onClick={() => void more()}
            >
              {loadingMore ? "Loading…" : "Show more"}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
