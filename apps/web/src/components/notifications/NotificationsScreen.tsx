"use client";

import { Bell, BellRing, Coins, PiggyBank, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { loadNotices, readAllNotices, readNotice, type Notice } from "@/lib/savings-client";

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

/** "2 min ago", "Yesterday", "3 Nov": how long ago, in the words a person would use. */
export function ago(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

function IconFor({ kind }: Readonly<{ kind: string }>) {
  const Icon = /missed|short/.test(kind)
    ? TriangleAlert
    : /matured|paid|created/.test(kind)
      ? PiggyBank
      : /soon/.test(kind)
        ? BellRing
        : Coins;
  return <Icon aria-hidden className="size-5" />;
}

function Messages() {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
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
        return setState({ phase: "failed" });
      }
      setState({
        phase: "ready",
        items: result.data.items,
        next: result.data.next,
        unread: result.data.unread,
        moreFailed: false,
      });
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
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
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
        <div className="grid justify-items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift">
          <Bell aria-hidden className="size-10 text-ink-muted" />
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
          <ul className="grid gap-2">
            {state.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  data-unread={item.readAt ? undefined : ""}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[var(--radius-l)] p-4 text-left",
                    item.readAt ? "bg-surface-sunken" : "bg-surface-raised shadow-lift",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
                      item.readAt ? "bg-surface text-ink-muted" : "bg-primary-tint text-primary",
                    )}
                  >
                    <IconFor kind={item.kind} />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[15px] leading-6",
                          item.readAt ? "font-medium" : "font-semibold",
                        )}
                      >
                        {item.title}
                      </span>
                      {!item.readAt && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-oro"
                          role="img"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                    <span className="text-[14px] leading-5 text-ink-muted">{item.body}</span>
                    <span className="text-[12px] text-ink-muted">{ago(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {state.moreFailed && (
            <p role="alert" className="text-center text-[15px] text-danger">
              We couldn&apos;t load more.
            </p>
          )}
          {state.next && (
            <Button variant="quiet" disabled={loadingMore} onClick={() => void more()}>
              {loadingMore ? "Loading…" : "Show more"}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
