import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Amount } from "@/components/ui/Amount";
import { cn } from "@/lib/cn";
import { whenText } from "@/lib/when";
import { accountLabel, describeTransaction, type WalletTransaction } from "@/lib/wallet";

/** The row's content. Direction is a sign and a word, never colour alone. */
function RowBody({ item }: Readonly<{ item: WalletTransaction }>) {
  const incoming = item.direction === "in";
  return (
    <>
      <span
        aria-hidden
        className={
          incoming
            ? "grid size-10 shrink-0 place-items-center rounded-full bg-leaf-tint text-leaf"
            : "grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-muted"
        }
      >
        {incoming ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
      </span>
      <span className="grid min-w-0 grow">
        <span className="text-[15px] leading-[22px] font-semibold text-ink">
          {describeTransaction(item.type)}
        </span>
        <span className="text-[13px] leading-[18px] text-ink-muted">
          {accountLabel(item.account)} ·{" "}
          <time dateTime={item.createdAt}>{whenText(item.createdAt)}</time>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="sr-only">{incoming ? "Money in" : "Money out"} </span>
        {incoming && (
          <span aria-hidden className="font-display text-[15px] font-semibold text-leaf">
            +
          </span>
        )}
        <Amount
          amount={incoming ? item.amount.amount : `-${item.amount.amount}`}
          currency={item.amount.currency}
          size="s"
          className={incoming ? "text-leaf" : undefined}
        />
      </span>
    </>
  );
}

/** "Mon, 6 Oct": the day a payment happened, in the device's time zone, for the desk's day groups. */
export const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(iso),
  );

/**
 * Recent activity. On a phone, a plain list. On a desk (`onSelect`), the rows are grouped by day and
 * each one opens its details beside the list, like a bank's dashboard.
 */
export function TransactionList({
  items,
  onSelect,
  selectedId,
  grouped,
}: Readonly<{
  items: readonly WalletTransaction[];
  onSelect?: (item: WalletTransaction) => void;
  selectedId?: string;
  /** Plain rows under a heading for each day (no picking). */
  grouped?: boolean;
}>) {
  if (items.length === 0) return <p className="py-4 text-ink-muted">No activity yet.</p>;
  if (!onSelect && !grouped) {
    return (
      <ul aria-label="Recent activity">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-line py-4 last:border-b-0"
          >
            <RowBody item={item} />
          </li>
        ))}
      </ul>
    );
  }
  const days: { day: string; items: WalletTransaction[] }[] = [];
  for (const item of items) {
    const day = dayLabel(item.createdAt);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(item);
    else days.push({ day, items: [item] });
  }
  return (
    <div className="grid gap-4 py-3" aria-label="Recent activity" role="group">
      {days.map(({ day, items: dayItems }) => (
        <section key={day} aria-label={day} className="grid gap-1">
          <h3 className="px-2 text-[13px] font-semibold text-ink-muted">{day}</h3>
          <ul className="grid gap-1">
            {dayItems.map((item) => (
              <li key={item.id}>
                {!onSelect ? (
                  <div className="flex items-center gap-3 rounded-[14px] px-2 py-3">
                    <RowBody item={item} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect?.(item)}
                    aria-pressed={item.id === selectedId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[14px] px-2 py-3 text-left transition-colors",
                      item.id === selectedId ? "bg-primary-tint" : "hover:bg-surface-sunken",
                    )}
                  >
                    <RowBody item={item} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
