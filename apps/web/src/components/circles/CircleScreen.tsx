"use client";

import { Check, Clock, Copy, Crown, MessageCircle, ShieldAlert, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleRing, type RingMember } from "@/components/CircleRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { TextField } from "@/components/ui/TextField";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Failure, Outcome } from "@/lib/api-send";
import { cn } from "@/lib/cn";
import type { CircleMember, ContributionStatus, GroupDetail, Swap } from "@/lib/groups-client";
import { formatMoney } from "@/lib/money-format";
import { dayText, longDayText } from "@/lib/schedule";
import { inviteText, whatsAppUrl } from "@/lib/share";
import { polling } from "@/lib/use-payment";
import { FREQ_WORDS, ORDER_WORDS, TrustBadge, useCircles, useCirclesLock } from "./CirclesFlow";
import { whenText } from "@/lib/when";
import { InstallCard } from "@/components/install/InstallCard";

const RING: Record<ContributionStatus, RingMember["status"]> = {
  scheduled: "pending",
  paid: "paid",
  late: "late",
  covered: "covered",
  missed: "late",
};
const WORD: Record<ContributionStatus, string> = {
  scheduled: "Waiting",
  paid: "Paid",
  late: "Paid late",
  covered: "Covered by deposit",
  missed: "Missed",
};

/** One circle, in whichever stage it is in: filling, picking turns, or under way. */
export function CircleScreen({ id }: Readonly<{ id: string }>) {
  const { preview, href, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  const params = useSearchParams();
  const fresh = params.get("new") === "1";
  const justJoined = params.get("joined") === "1";

  const [group, setGroup] = useState<GroupDetail | "failed" | "missing">();
  const [swaps, setSwaps] = useState<readonly Swap[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();
  const [confirm, setConfirm] = useState<"leave" | "cancel" | null>(null);
  const [friend, setFriend] = useState("");
  const [note, setNote] = useState<string>();
  const [copied, setCopied] = useState(false);

  const open = group && group !== "failed" && group !== "missing" ? group : undefined;
  const watching = open?.status === "open" || open?.status === "picking";

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.get(id);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setGroup(
          result.failure.kind === "refused" && result.failure.status === 404 ? "missing" : "failed",
        );
      }
      setGroup(result.data);
      if (result.data.status === "running" && result.data.isMember) {
        const list = await gateway.swaps(id);
        if (live && list.ok) setSwaps(list.data);
      }
    })();
    return () => {
      live = false;
    };
  }, [gateway, id, lock, router, attempt]);

  // While people are still joining or picking, look again every few seconds, so the circle fills in front of them.
  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => setAttempt((n) => n + 1), polling.everyMs);
    return () => clearInterval(timer);
  }, [watching]);

  if (lock) return <FlowLocked lock={lock} title="Circle" path={`/circles/${id}`} />;

  if (group === undefined) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }
  if (group === "missing" || group === "failed") {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          {group === "missing"
            ? "We couldn't find that circle."
            : "We couldn't load this circle. Check your connection and try again."}
        </p>
        {group === "failed" ? (
          <Button onClick={() => (setGroup(undefined), setAttempt((n) => n + 1))}>Try again</Button>
        ) : (
          <ButtonLink href={href("/circles")}>Back to circles</ButtonLink>
        )}
      </main>
    );
  }

  const g = group;
  const currency = g.currency;
  // Only drawn once the circle has loaded in the browser, so there is nothing for the server to disagree with.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = origin && g.inviteCode ? `${origin}/circles/join/${g.inviteCode}` : "";
  const ordered = g.members.slice().sort((a, b) => (a.spot ?? 1000) - (b.spot ?? 1000));
  const roundNo = g.nextDue?.roundNo ?? null;

  function fail(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setErrorCode(failure.kind === "refused" ? failure.code : undefined);
    setError(failure.message);
  }
  async function run<T>(work: () => Promise<Outcome<T>>, then?: (data: T) => void) {
    setError(undefined);
    setErrorCode(undefined);
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (!result.ok) return fail(result.failure);
    then?.(result.data);
  }
  const apply = (next: GroupDetail) => setGroup(next);

  // The ring: places in spot order once turns are set, otherwise in order of joining, with open places hollow.
  const seats: RingMember[] =
    g.status === "open"
      ? [
          ...g.members.map((m) => ({ name: m.displayName, status: "paid" as const })),
          ...Array.from({ length: Math.max(0, g.size - g.members.length) }, () => ({
            name: "Open place",
            status: "pending" as const,
          })),
        ]
      : ordered.map((m) => ({
          name: m.displayName,
          status:
            g.status === "running" || g.status === "completed"
              ? RING[m.current ?? "scheduled"]
              : m.spot
                ? ("paid" as const)
                : ("pending" as const),
        }));
  const youIndex = ordered.findIndex((m) => m.isYou);
  const recipientIndex = roundNo ? ordered.findIndex((m) => m.spot === roundNo) : undefined;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title={g.name}
        subtitle={g.community ?? undefined}
        backHref={href("/circles")}
      />

      {fresh && g.status === "open" && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
        >
          <Sparkles aria-hidden className="size-5 shrink-0" />
          Your circle is open. Share the link below to fill it before {longDayText(g.startDate)}.
        </p>
      )}
      {justJoined && g.isMember && (
        <>
          <p
            role="status"
            className="mb-4 flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
          >
            <Sparkles aria-hidden className="size-5 shrink-0" />
            You&apos;re in. We&apos;ll remind you before each payment.
          </p>
          <div className="mb-6">
            <InstallCard />
          </div>
        </>
      )}
      {note && (
        <p
          role="status"
          className="mb-6 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] text-leaf"
        >
          {note}
        </p>
      )}

      <section
        aria-label="The circle"
        className="grid justify-items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
      >
        <CircleRing
          members={seats}
          {...(recipientIndex !== undefined && recipientIndex >= 0
            ? { recipient: recipientIndex }
            : {})}
          {...(youIndex >= 0 && g.status !== "open" ? { you: youIndex } : {})}
          center={
            g.status === "running" && roundNo
              ? { label: `of ${g.size} rounds`, value: `Round ${roundNo}` }
              : g.status === "completed"
                ? { label: "all paid", value: "Done" }
                : { label: "joined", value: `${g.memberCount}/${g.size}` }
          }
          title={`${g.name}: ${g.memberCount} of ${g.size} people`}
          size={220}
        />
        <p className="text-center text-[15px] text-ink-muted">
          <Amount amount={g.contribution} currency={currency} locale={locale} size="s" />{" "}
          {FREQ_WORDS[g.frequency]}, {g.size} people. Each turn pays{" "}
          <Amount amount={g.pot} currency={currency} locale={locale} size="s" />.
        </p>
        <p className="text-center text-[13px] text-ink-muted">{ORDER_WORDS[g.orderMethod]}</p>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-center text-[15px] font-medium text-danger">
          {error}{" "}
          {errorCode === "deposit_needed" && (
            <Link href={href("/wallet/add")} className="underline underline-offset-4">
              Add money
            </Link>
          )}
        </p>
      )}

      {g.status === "cancelled" && (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[15px] leading-6"
        >
          This circle was called off. Anyone who had locked a deposit has it back in their wallet.
        </p>
      )}
      {g.status === "completed" && (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
        >
          Every turn has been paid. Any deposit you had locked is back in your wallet.
        </p>
      )}

      {/* ---- filling up ---- */}
      {g.status === "open" && g.isMember && (
        <section aria-label="Fill the circle" className="mt-6 grid gap-4">
          <h2 className="font-display text-[20px] leading-7 font-semibold">Get it full</h2>
          <p className="text-[15px] leading-6 text-ink-muted">
            {g.size - g.memberCount} {g.size - g.memberCount === 1 ? "place is" : "places are"}{" "}
            left. It starts on {longDayText(g.startDate)}, and only if it&apos;s full by then.
          </p>
          {link && (
            <div className="relative grid gap-2 rounded-[var(--radius-l)] bg-primary-tint p-4">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-primary/35"
              />
              <p className="text-[13px] font-semibold text-tertiary">Invite code</p>
              <p className="font-mono text-[24px] font-semibold tracking-[0.12em]">
                {g.inviteCode}
              </p>
              <p className="text-[13px] break-all text-ink-muted">{link}</p>
            </div>
          )}
          {link && (
            <div className="grid grid-cols-2 gap-3">
              <ButtonLink
                href={whatsAppUrl(link)}
                variant="money"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden className="size-5" />
                WhatsApp
              </ButtonLink>
              <Button
                variant="quiet"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteText(link));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // Blocked clipboards: the link is on screen to copy by hand.
                  }
                }}
              >
                {copied ? (
                  <Check aria-hidden className="size-5" />
                ) : (
                  <Copy aria-hidden className="size-5" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => gateway.invite(g.id, friend.trim()),
                () => (
                  setFriend(""),
                  setNote(`Invite sent to @${friend.trim().replace(/^@/, "")}.`)
                ),
              );
            }}
          >
            <TextField
              label="Invite a friend"
              prefix="@"
              value={friend}
              onChange={setFriend}
              autoComplete="off"
              autoCapitalize="none"
              hint="Their username. We'll send them the circle."
            />
            <Button
              type="submit"
              variant="quiet"
              loading={busy}
              disabled={busy || friend.trim().length < 3}
            >
              Send invite
            </Button>
          </form>
          {preview && gateway.fillWithSamples && (
            <Button
              variant="quiet"
              loading={busy}
              disabled={busy}
              onClick={() => void run(() => gateway.fillWithSamples!(g.id), apply)}
            >
              Preview: have sample people fill the circle
            </Button>
          )}
          {confirm === null ? (
            g.isCreator ? (
              <Button variant="danger" onClick={() => setConfirm("cancel")}>
                Call off the circle
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirm("leave")}>
                Leave the circle
              </Button>
            )
          ) : (
            <div className="grid gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4">
              <p className="text-[15px] leading-6">
                {confirm === "cancel"
                  ? "Call off this circle? Everyone is told, and every deposit goes back to its owner."
                  : "Leave this circle? Your deposit comes back to your wallet now. You can join again while there's room."}
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button variant="quiet" onClick={() => setConfirm(null)}>
                  Stay
                </Button>
                <Button
                  variant="danger"
                  loading={busy}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => (confirm === "cancel" ? gateway.cancel(g.id) : gateway.leave(g.id)),
                      () =>
                        confirm === "cancel"
                          ? setAttempt((n) => n + 1)
                          : router.push(href("/circles")),
                    )
                  }
                >
                  {confirm === "cancel" ? "Call it off" : "Leave"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- picking turns ---- */}
      {g.status === "picking" && g.isMember && (
        <section aria-label="Pick your turn" className="mt-6 grid gap-4">
          <h2 className="font-display text-[20px] leading-7 font-semibold">
            {g.mySpot ? `You picked turn ${g.mySpot}` : "Pick your turn"}
          </h2>
          <p className="text-[15px] leading-6 text-ink-muted">
            {g.mySpot
              ? "Waiting for the others. Anyone who hasn't picked when time is up is given a turn that's left."
              : `Everyone can pick at once. The first ${g.rules.earlySpots} turns pay out earliest; if you're new to circles they need a larger deposit (${formatMoney(g.rules.earlyDeposit, locale)} in all).`}
            {g.pickDeadline && <> Picking closes {whenText(g.pickDeadline)}.</>}
          </p>
          <ul aria-label="Turns" className="grid grid-cols-3 gap-2">
            {Array.from({ length: g.size }, (_, i) => i + 1).map((spot) => {
              const holder = g.members.find((m) => m.spot === spot);
              const early = spot <= g.rules.earlySpots;
              return (
                <li key={spot}>
                  <button
                    type="button"
                    disabled={Boolean(holder) || Boolean(g.mySpot) || busy}
                    aria-label={
                      holder
                        ? `Turn ${spot}, taken by ${holder.isYou ? "you" : holder.displayName}`
                        : `Pick turn ${spot}${early ? " (early)" : ""}`
                    }
                    onClick={() => void run(() => gateway.pick(g.id, spot), apply)}
                    className={cn(
                      "grid min-h-[72px] w-full place-items-center gap-0.5 rounded-[var(--radius-m)] border-[1.5px] p-2 text-center",
                      holder?.isYou
                        ? "border-oro bg-oro text-on-oro"
                        : holder
                          ? "border-line bg-surface-sunken text-ink-muted"
                          : "border-primary bg-primary-tint text-primary",
                    )}
                  >
                    <span className="font-display text-[22px] leading-6 font-bold">{spot}</span>
                    <span className="text-[11px] leading-4 font-semibold">
                      {holder
                        ? holder.isYou
                          ? "You"
                          : holder.displayName.split(" ")[0]
                        : early
                          ? "Early"
                          : "Free"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---- under way ---- */}
      {(g.status === "running" || g.status === "completed") && g.isMember && (
        <>
          {g.mySpot && (
            <section
              aria-label="Your turn"
              className="mt-4 grid gap-1 rounded-[var(--radius-l)] bg-oro-tint p-4 text-oro-ink"
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <Crown aria-hidden className="size-4" />
                YOUR TURN
              </p>
              <p className="text-[17px] leading-6">
                Turn {g.mySpot} of {g.size}:{" "}
                <span className="font-semibold">
                  {longDayText(g.rounds[g.mySpot - 1]?.dueOn ?? g.startDate)}
                </span>
                , when{" "}
                <Amount amount={g.pot} currency={currency} locale={locale} size="s" tone="oro" /> is
                paid out to you.
              </p>
            </section>
          )}

          {g.status === "running" && roundNo && (
            <section aria-label="This round" className="mt-6 grid gap-3">
              <h2 className="font-display text-[20px] leading-7 font-semibold">
                Round {roundNo}: who has paid
              </h2>
              <p className="text-[14px] text-ink-muted">
                {g.rounds[roundNo - 1]!.paid} of {g.size} paid · due {dayText(g.nextDue!.dueOn)} ·
                goes to {g.rounds[roundNo - 1]!.recipientName}
              </p>
              <ul className="grid gap-2">
                {ordered.map((m) => (
                  <MemberRow key={m.username ?? m.displayName} member={m} />
                ))}
              </ul>
              {preview && gateway.nextRound && (
                <Button
                  variant="quiet"
                  loading={busy}
                  disabled={busy}
                  onClick={() => void run(() => gateway.nextRound!(g.id), apply)}
                >
                  Preview: collect this round and pay it out
                </Button>
              )}
            </section>
          )}

          <section aria-label="Every round" className="mt-6 grid gap-3">
            <h2 className="font-display text-[20px] leading-7 font-semibold">Every round</h2>
            <ol className="grid gap-2">
              {g.rounds.map((r) => (
                <li
                  key={r.roundNo}
                  className="flex items-center justify-between gap-3 border-b border-dashed border-line pb-2 text-[15px]"
                >
                  <span>
                    <span className="font-semibold">Round {r.roundNo}</span> · {dayText(r.dueOn)}
                    <span className="block text-[13px] text-ink-muted">
                      {r.isYours ? "You" : r.recipientName}
                    </span>
                  </span>
                  <span className="text-right text-[13px]">
                    {r.status === "scheduled" ? (
                      <span className="text-ink-muted">Coming</span>
                    ) : (
                      <>
                        <span className="block font-semibold text-leaf">
                          Paid out{r.status === "paid_out_short" ? " (short)" : ""}
                        </span>
                        {r.payout && <Amount {...r.payout} locale={locale} size="s" />}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {g.status === "running" && swaps.length > 0 && (
            <section aria-label="Swap requests" className="mt-6 grid gap-3">
              <h2 className="font-display text-[20px] leading-7 font-semibold">Swap requests</h2>
              {swaps.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4"
                >
                  <p className="text-[15px] leading-6">
                    {s.incoming
                      ? `${s.fromName} would like to swap turns with you.`
                      : `You asked ${s.toName} to swap turns.`}
                  </p>
                  {s.incoming && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="quiet"
                        loading={busy}
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => gateway.answerSwap(g.id, s.id, false),
                            (d) => (apply(d), setAttempt((n) => n + 1)),
                          )
                        }
                      >
                        No
                      </Button>
                      <Button
                        loading={busy}
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => gateway.answerSwap(g.id, s.id, true),
                            (d) => (apply(d), setAttempt((n) => n + 1)),
                          )
                        }
                      >
                        Yes, swap
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
          {g.status === "running" &&
            g.mySpot &&
            !g.rounds.some((r) => r.status !== "scheduled") && (
              <SwapAsk
                members={ordered.filter((m) => !m.isYou)}
                busy={busy}
                onAsk={(username) =>
                  void run(
                    () => gateway.proposeSwap(g.id, username),
                    (d) => (apply(d), setAttempt((n) => n + 1)),
                  )
                }
              />
            )}

          <section
            aria-label="Your deposit"
            className="mt-6 grid gap-2 rounded-[var(--radius-l)] bg-primary-tint p-4 text-[14px] leading-5"
          >
            <p className="flex items-center gap-2 font-semibold text-tertiary">
              <ShieldAlert aria-hidden className="size-4" />
              YOUR DEPOSIT
            </p>
            <p>
              {g.myDeposit && BigInt(g.myDeposit.amount) > 0n ? (
                <>
                  <Amount {...g.myDeposit} locale={locale} size="s" /> is locked, and comes back
                  when the circle ends. If a payment is missed after {g.graceDays} days, the deposit
                  pays it.
                </>
              ) : (
                <>
                  You&apos;re trusted, so nothing is locked. A payment missed after {g.graceDays}{" "}
                  days is recovered from you, and goes on your record.
                </>
              )}
            </p>
          </section>
        </>
      )}

      {/* ---- who's in it ---- */}
      {g.members.length > 0 && g.status !== "running" && (
        <section aria-label="Members" className="mt-6 grid gap-3">
          <h2 className="font-display text-[20px] leading-7 font-semibold">Who&apos;s in</h2>
          <ul className="grid gap-2">
            {ordered.map((m) => (
              <li
                key={m.username ?? m.displayName}
                className="flex items-center justify-between gap-3 text-[15px]"
              >
                <span>
                  <span className="font-semibold">{m.isYou ? "You" : m.displayName}</span>
                  {m.isCreator && <span className="text-[13px] text-ink-muted"> · made it</span>}
                  {m.spot && (
                    <span className="block text-[13px] text-ink-muted">Turn {m.spot}</span>
                  )}
                </span>
                <TrustBadge level={m.trust.level} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.draws.length > 0 && (
        <details className="mt-6 rounded-[var(--radius-l)] bg-surface-sunken p-4">
          <summary className="cursor-pointer text-[15px] font-semibold">
            How the turns were drawn
          </summary>
          {g.draws.map((d) => (
            <div key={d.seed} className="mt-3 grid gap-2 text-[14px] leading-5">
              <p className="text-ink-muted">
                {d.kind === "random" ? "A draw by lot" : "Turns left over after picking"},{" "}
                {whenText(d.createdAt)}. The seed below was made before the order was known, so the
                same people and seed always give this order; anyone can check it.
              </p>
              <p className="font-mono text-[12px] break-all">{d.seed}</p>
              <ol className="grid gap-1">
                {d.order.map((o, i) => (
                  <li key={`${d.seed}-${i}`}>
                    {o.spot ?? i + 1}. {o.displayName}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </details>
      )}

      {/* ---- not a member yet ---- */}
      {!g.isMember && g.status === "open" && (
        <section aria-label="Join" className="mt-6 grid gap-3">
          <Button
            size="lg"
            variant="money"
            loading={busy}
            disabled={busy}
            onClick={() => void run(() => gateway.joinPublic(g.id), apply)}
          >
            {busy ? "Joining…" : "Join this circle"}
          </Button>
          <p className="text-[13px] leading-5 text-ink-muted">
            People new to circles lock a deposit of {formatMoney(g.rules.deposit, locale)} until it
            ends. Needs auto-debit.
          </p>
        </section>
      )}
    </main>
  );
}

function MemberRow({ member }: Readonly<{ member: CircleMember }>) {
  const status = member.current ?? "scheduled";
  const Icon =
    status === "paid" || status === "late" || status === "covered"
      ? Check
      : status === "missed"
        ? X
        : Clock;
  return (
    <li className="flex items-center justify-between gap-3 text-[15px]">
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full",
            status === "paid" && "bg-leaf-tint text-leaf",
            status === "late" && "bg-danger-tint text-danger",
            status === "covered" && "bg-tertiary-tint text-tertiary",
            status === "missed" && "bg-danger-tint text-danger",
            status === "scheduled" && "bg-surface-sunken text-ink-muted",
          )}
        >
          <Icon aria-hidden className="size-4" />
        </span>
        <span>
          <span className="font-semibold">{member.isYou ? "You" : member.displayName}</span>
          <span className="block text-[13px] text-ink-muted">{WORD[status]}</span>
        </span>
      </span>
      <TrustBadge level={member.trust.level} />
    </li>
  );
}

function SwapAsk({
  members,
  busy,
  onAsk,
}: Readonly<{
  members: readonly CircleMember[];
  busy: boolean;
  onAsk: (username: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Swap turns" className="mt-6 grid gap-3">
      {!open ? (
        <Button variant="quiet" onClick={() => setOpen(true)}>
          Swap turns with someone
        </Button>
      ) : (
        <div className="grid gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4">
          <p className="text-[14px] leading-5 text-ink-muted">
            Ask someone to trade turns. It only happens if they say yes, and only before the first
            round.
          </p>
          <ul className="grid gap-2">
            {members.map((m) => (
              <li
                key={m.username ?? m.displayName}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-[15px]">
                  {m.displayName}
                  <span className="block text-[13px] text-ink-muted">Turn {m.spot}</span>
                </span>
                <Button
                  variant="quiet"
                  loading={busy}
                  disabled={busy || !m.username}
                  aria-label={`Ask ${m.displayName} to swap`}
                  onClick={() => m.username && onAsk(m.username)}
                >
                  Ask
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
