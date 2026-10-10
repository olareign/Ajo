"use client";

import { useId, useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/money-format";
import { major, monthLabel, niceTicks, type InsightMonth } from "@/lib/insights";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BAR = 18; // capped thickness: the band's leftover is air
const GAP = 2; // surface gap between the pair

type Tip = Readonly<{ x: number; y: number; title: string; lines: readonly string[] }>;

function Tooltip({ tip }: Readonly<{ tip: Tip | null }>) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 grid min-w-36 -translate-x-1/2 -translate-y-full gap-0.5 rounded-m bg-ink px-3 py-2 text-[12px] leading-4 text-surface shadow-lift"
      style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}
    >
      <span className="font-semibold">{tip.title}</span>
      {tip.lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}

function Axis({
  ticks,
  top,
  currency,
  locale,
}: Readonly<{ ticks: number[]; top: number; currency: string; locale: string }>) {
  return (
    <g aria-hidden>
      {ticks.map((t) => {
        const y = PAD.top + PLOT_H - (t / top) * PLOT_H;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-ink-muted text-[11px]"
            >
              {formatMoneyCompact({ amount: String(Math.round(t * 100)), currency }, locale)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A column with a 4px rounded data-end and a square foot on the baseline. */
function column(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  const base = y + h;
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/** Money in and money out, month by month, as paired columns from one baseline. */
export function InOutChart({
  months,
  locale,
}: Readonly<{ months: readonly InsightMonth[]; locale: string }>) {
  const titleId = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const currency = months[0]?.currency ?? "NGN";
  const max = Math.max(0, ...months.flatMap((m) => [major(m.moneyIn), major(m.moneyOut)]));
  const { top, ticks } = niceTicks(max);
  const band = PLOT_W / Math.max(1, months.length);
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H;
  const last = months[months.length - 1];
  return (
    <figure className="grid gap-3">
      <figcaption id={titleId} className="sr-only">
        Money in and money out by month
      </figcaption>
      <ul className="flex flex-wrap gap-4 text-[13px] text-ink-muted" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-sm bg-[var(--chart-in)]" />
          Money in
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-sm bg-[var(--chart-out)]" />
          Money out
        </li>
      </ul>
      <div className="relative" onPointerLeave={() => setTip(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          className="h-auto w-full"
        >
          <Axis ticks={ticks} top={top} currency={currency} locale={locale} />
          {months.map((m, i) => {
            const cx = PAD.left + band * i + band / 2;
            const inV = major(m.moneyIn);
            const outV = major(m.moneyOut);
            const show = () =>
              setTip({
                x: cx,
                y: Math.min(y(inV), y(outV)) - 6,
                title: monthLabel(m.month, true),
                lines: [
                  `In ${formatMoney({ amount: m.moneyIn, currency }, locale)}`,
                  `Out ${formatMoney({ amount: m.moneyOut, currency }, locale)}`,
                ],
              });
            return (
              <g key={m.month}>
                <path
                  d={column(cx - BAR - GAP / 2, y(inV), BAR, PAD.top + PLOT_H - y(inV))}
                  fill="var(--chart-in)"
                />
                <path
                  d={column(cx + GAP / 2, y(outV), BAR, PAD.top + PLOT_H - y(outV))}
                  fill="var(--chart-out)"
                />
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                  {monthLabel(m.month)}
                </text>
                {/* A hit target the whole height of the band, bigger than the marks. */}
                <rect
                  x={cx - band / 2}
                  y={PAD.top}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  onPointerEnter={show}
                  onPointerMove={show}
                />
              </g>
            );
          })}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
          {last && max > 0 && (
            <text
              x={PAD.left + band * (months.length - 1) + band / 2}
              y={Math.min(y(major(last.moneyIn)), y(major(last.moneyOut))) - 6}
              textAnchor="middle"
              className="fill-ink text-[11px] font-semibold"
            >
              {formatMoneyCompact({ amount: last.moneyIn, currency }, locale)} in
            </text>
          )}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </figure>
  );
}

/** What is saved in plans at the end of each month: one line, with its latest value at the end. */
export function SavingsLine({
  months,
  locale,
}: Readonly<{ months: readonly InsightMonth[]; locale: string }>) {
  const titleId = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const currency = months[0]?.currency ?? "NGN";
  const values = months.map((m) => major(m.endSavings));
  const { top, ticks } = niceTicks(Math.max(0, ...values));
  const step = months.length > 1 ? PLOT_W / (months.length - 1) : 0;
  const x = (i: number) => PAD.left + (months.length > 1 ? step * i : PLOT_W / 2);
  const y = (v: number) => PAD.top + PLOT_H - (Math.max(0, v) / top) * PLOT_H;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${PAD.top + PLOT_H} ${points} ${x(values.length - 1)},${PAD.top + PLOT_H}`;
  const lastI = values.length - 1;
  return (
    <figure className="grid gap-3">
      <figcaption id={titleId} className="sr-only">
        Saved in plans at the end of each month
      </figcaption>
      <div className="relative" onPointerLeave={() => setTip(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          className="h-auto w-full"
        >
          <Axis ticks={ticks} top={top} currency={currency} locale={locale} />
          <polygon points={area} fill="var(--chart-in)" opacity={0.1} />
          <polyline
            points={points}
            fill="none"
            stroke="var(--chart-in)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {tip && (
            <line
              x1={tip.x}
              x2={tip.x}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
          )}
          {lastI >= 0 && (
            <>
              <circle
                cx={x(lastI)}
                cy={y(values[lastI]!)}
                r={5}
                fill="var(--chart-in)"
                stroke="var(--surface-raised)"
                strokeWidth={2}
              />
              <text
                x={x(lastI) - 8}
                y={y(values[lastI]!) - 10}
                textAnchor="end"
                className="fill-ink text-[11px] font-semibold"
              >
                {formatMoneyCompact({ amount: months[lastI]!.endSavings, currency }, locale)}
              </text>
            </>
          )}
          {months.map((m, i) => (
            <g key={m.month}>
              {(months.length <= 6 || i % 2 === lastI % 2) && (
                <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                  {monthLabel(m.month)}
                </text>
              )}
              <rect
                x={x(i) - (step || PLOT_W) / 2}
                y={PAD.top}
                width={step || PLOT_W}
                height={PLOT_H}
                fill="transparent"
                onPointerEnter={() =>
                  setTip({
                    x: x(i),
                    y: y(values[i]!) - 8,
                    title: monthLabel(m.month, true),
                    lines: [`Saved ${formatMoney({ amount: m.endSavings, currency }, locale)}`],
                  })
                }
              />
            </g>
          ))}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </figure>
  );
}
