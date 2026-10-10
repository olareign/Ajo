"use client";

import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { send } from "@/lib/api-send";
import { countryConfig } from "@/lib/kyc-config";
import {
  dayIn,
  presetRange,
  readStatement,
  statementCsv,
  type Preset,
  type Statement,
} from "@/lib/statement";
import { accountLabel, currencyName, describeTransaction } from "@/lib/wallet";
import { whenText } from "@/lib/when";

export function StatementsScreen() {
  return <MeGate needs="onboarded">{(me) => <Statements me={me} />}</MeGate>;
}

const PRESETS: readonly { value: Preset | "custom"; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Choose dates" },
];

const ZONES: Readonly<Record<string, string>> = { NG: "Africa/Lagos", GB: "Europe/London" };

type Load =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "ready"; statement: Statement }>
  | Readonly<{ phase: "failed"; message: string }>;

/**
 * Every line on your accounts for a range of days, with what you started and ended with, and a
 * spreadsheet copy to keep. On a wide screen the lines are a table; on a phone, a list.
 */
function Statements({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const zone = ZONES[me.country ?? ""] ?? "UTC";
  const locale = countryConfig(me.country)?.locale ?? "en-GB";
  const today = dayIn(new Date(), zone);
  const [preset, setPreset] = useState<Preset | "custom">("this-month");
  const [range, setRange] = useState(() => presetRange("this-month", today));
  const [draft, setDraft] = useState(range);
  const [load, setLoad] = useState<Load>({ phase: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await send<Record<string, unknown>>(
        "GET",
        `/api/wallet/statement?${new URLSearchParams(range)}`,
      );
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setLoad({ phase: "failed", message: result.failure.message });
      }
      const statement = readStatement(result.data);
      setLoad(
        statement
          ? { phase: "ready", statement }
          : { phase: "failed", message: "We couldn't read that statement. Try again." },
      );
    })();
    return () => {
      live = false;
    };
  }, [range, router]);

  function choose(value: string) {
    const next = value as Preset | "custom";
    setPreset(next);
    if (next === "custom") return;
    const chosen = presetRange(next, today);
    setLoad({ phase: "loading" });
    setRange(chosen);
    setDraft(chosen);
  }

  function download(statement: Statement) {
    const url = URL.createObjectURL(
      new Blob([statementCsv(statement)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ajo-statement-${statement.from}-to-${statement.to}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28 lg:max-w-6xl lg:pt-8 lg:pb-12">
      <ScreenHeader
        title="Statements"
        subtitle="Every payment in and out of your accounts, for the days you choose."
        backHref="/wallet"
      />
      <div className="grid gap-4">
        <ChoiceChips label="Period" options={PRESETS} value={preset} onChange={choose} />
        {preset === "custom" && (
          <form
            className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.from && draft.to) {
                setLoad({ phase: "loading" });
                setRange(draft);
              }
            }}
          >
            <label className="grid gap-1.5 text-[14px] font-medium">
              From
              <input
                type="date"
                value={draft.from}
                max={today}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className="min-h-11 rounded-m border border-line-strong bg-surface px-3 text-[15px]"
              />
            </label>
            <label className="grid gap-1.5 text-[14px] font-medium">
              To
              <input
                type="date"
                value={draft.to}
                max={today}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className="min-h-11 rounded-m border border-line-strong bg-surface px-3 text-[15px]"
              />
            </label>
            <Button type="submit" className="col-span-2 sm:col-span-1">
              Show
            </Button>
          </form>
        )}

        {load.phase === "loading" && (
          <div role="status" className="grid gap-3">
            <span className="sr-only">Loading…</span>
            <div
              aria-hidden
              className="h-28 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
            />
            <div
              aria-hidden
              className="h-64 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
            />
          </div>
        )}
        {load.phase === "failed" && (
          <p
            role="alert"
            className="rounded-[var(--radius-l)] bg-danger-tint p-4 text-[15px] text-danger"
          >
            {load.message}
          </p>
        )}
        {load.phase === "ready" && (
          <>
            {load.statement.balances.length === 0 ? (
              <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
                No money has moved in your accounts yet.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {load.statement.balances.map((b) => (
                  <section
                    key={b.currency}
                    aria-label={`${currencyName(b.currency)} summary`}
                    className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
                  >
                    <h2 className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted uppercase">
                      {currencyName(b.currency)}
                    </h2>
                    <dl className="grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-4">
                      {(
                        [
                          ["Opening", b.opening],
                          ["Money in", b.moneyIn],
                          ["Money out", b.moneyOut],
                          ["Closing", b.closing],
                        ] as const
                      ).map(([label, amount]) => (
                        <div key={label} className="grid gap-0.5">
                          <dt className="text-ink-muted">{label}</dt>
                          <dd>
                            <Amount
                              amount={amount}
                              currency={b.currency}
                              locale={locale}
                              size="s"
                            />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-ink-muted">
                {load.statement.lines.length} {load.statement.lines.length === 1 ? "line" : "lines"}
                , {load.statement.from} to {load.statement.to}
              </p>
              <Button
                variant="quiet"
                disabled={load.statement.lines.length === 0}
                onClick={() => download(load.statement)}
              >
                <Download aria-hidden className="size-4" />
                Download CSV
              </Button>
            </div>
            {load.statement.truncated && (
              <p
                role="status"
                className="rounded-[var(--radius-l)] bg-oro-tint p-4 text-[14px] text-oro-ink"
              >
                That range has more lines than one statement holds. Choose a shorter range to see
                them all.
              </p>
            )}
            {load.statement.lines.length > 0 && (
              <div className="overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
                <table className="hidden w-full border-collapse text-left text-[14px] lg:table">
                  <caption className="sr-only">Statement lines</caption>
                  <thead>
                    <tr className="text-[12px] tracking-[0.04em] text-ink-muted uppercase">
                      <th className="border-b border-line px-4 py-3 font-semibold">When</th>
                      <th className="border-b border-line px-4 py-3 font-semibold">Description</th>
                      <th className="border-b border-line px-4 py-3 font-semibold">Account</th>
                      <th className="border-b border-line px-4 py-3 text-right font-semibold">
                        Money in
                      </th>
                      <th className="border-b border-line px-4 py-3 text-right font-semibold">
                        Money out
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {load.statement.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-surface-sunken">
                        <td className="border-b border-line px-4 py-3 whitespace-nowrap text-ink-muted">
                          {whenText(l.at)}
                        </td>
                        <td className="border-b border-line px-4 py-3 font-medium">
                          {describeTransaction(l.type)}
                        </td>
                        <td className="border-b border-line px-4 py-3 text-ink-muted">
                          {accountLabel(l.account)}
                        </td>
                        <td className="border-b border-line px-4 py-3 text-right">
                          {l.direction === "in" && (
                            <Amount
                              amount={l.amount}
                              currency={l.currency}
                              locale={locale}
                              size="s"
                              className="text-leaf"
                            />
                          )}
                        </td>
                        <td className="border-b border-line px-4 py-3 text-right">
                          {l.direction === "out" && (
                            <Amount
                              amount={l.amount}
                              currency={l.currency}
                              locale={locale}
                              size="s"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="divide-y divide-line lg:hidden" aria-label="Statement lines">
                  {load.statement.lines.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-full ${l.direction === "in" ? "bg-leaf-tint text-leaf" : "bg-surface-sunken text-ink-muted"}`}
                      >
                        {l.direction === "in" ? (
                          <ArrowDownLeft aria-hidden className="size-4" />
                        ) : (
                          <ArrowUpRight aria-hidden className="size-4" />
                        )}
                      </span>
                      <span className="grid min-w-0 grow">
                        <span className="truncate text-[15px] font-semibold">
                          {describeTransaction(l.type)}
                        </span>
                        <span className="text-[12px] text-ink-muted">
                          {accountLabel(l.account)} · {whenText(l.at)}
                        </span>
                      </span>
                      <span className="sr-only">
                        {l.direction === "in" ? "Money in" : "Money out"}
                      </span>
                      <Amount
                        amount={l.direction === "in" ? l.amount : `-${l.amount}`}
                        currency={l.currency}
                        locale={locale}
                        size="s"
                        className={l.direction === "in" ? "text-leaf" : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
