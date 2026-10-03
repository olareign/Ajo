import { Amount } from "@/components/ui/Amount";
import { currencyName, type Wallet } from "@/lib/wallet";

/** One currency's money: what can be spent, then what is held back and what is saved. */
export function BalanceCard({ wallet }: Readonly<{ wallet: Wallet }>) {
  const name = currencyName(wallet.currency);
  return (
    <section
      aria-label={`${name} wallet`}
      className="grid gap-5 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
    >
      <p className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">{name}</p>
      <div className="grid gap-1">
        <p className="text-[13px] text-ink-muted">Available</p>
        <Amount {...wallet.available} size="xl" />
      </div>
      <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div className="grid gap-1">
          <dt className="text-[13px] text-ink-muted">Locked</dt>
          <dd>
            <Amount {...wallet.locked} size="s" />
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-[13px] text-ink-muted">Savings</dt>
          <dd>
            <Amount {...wallet.savings} size="s" />
          </dd>
        </div>
      </dl>
    </section>
  );
}
