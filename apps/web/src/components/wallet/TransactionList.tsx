import { Amount } from "@/components/ui/Amount";
import { accountLabel, describeTransaction, type WalletTransaction } from "@/lib/wallet";

const DATE = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });

/** Direction is a sign and a word, never colour alone. */
function Row({ item }: Readonly<{ item: WalletTransaction }>) {
  const incoming = item.direction === "in";
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[15px] leading-[22px] font-semibold text-ink">
          {describeTransaction(item.type)}
        </p>
        <p className="text-[13px] leading-[18px] text-ink-muted">
          {accountLabel(item.account)} ·{" "}
          <time dateTime={item.createdAt}>{DATE.format(new Date(item.createdAt))}</time>
        </p>
      </div>
      <p className="shrink-0 text-right">
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
      </p>
    </li>
  );
}

export function TransactionList({ items }: Readonly<{ items: readonly WalletTransaction[] }>) {
  if (items.length === 0) return <p className="text-ink-muted">No activity yet.</p>;
  return (
    <ul aria-label="Recent activity">
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </ul>
  );
}
