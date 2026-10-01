import { money, type Money } from "./money";

/**
 * Double-entry ledger rules (docs/solution-architecture.md, "Money movement").
 * Balances are derived from entries, entries are never edited, and every transaction
 * balances per currency. This in-memory ledger is the reference model; the Postgres
 * implementation must pass the same rules.
 */
export type Direction = "debit" | "credit";

export type AccountInput = Readonly<{ id: string; currency: string; normal: Direction }>;

export type EntryInput = Readonly<{ accountId: string; direction: Direction; amount: Money }>;

export type TransactionInput = Readonly<{
  idempotencyKey: string;
  type: string;
  reference?: string;
  entries: readonly EntryInput[];
}>;

export type Transaction = Readonly<{
  id: string;
  idempotencyKey: string;
  type: string;
  reference?: string;
  entries: readonly EntryInput[];
}>;

export class UnbalancedTransactionError extends Error {
  constructor(currency: string) {
    super(`Debits and credits do not balance in ${currency}`);
    this.name = "UnbalancedTransactionError";
  }
}

function fingerprint(input: TransactionInput): string {
  return JSON.stringify([input.type, input.reference ?? null, input.entries]);
}

export class Ledger {
  private readonly accounts = new Map<string, AccountInput>();
  private readonly transactions = new Map<string, Transaction>();
  private readonly byKey = new Map<string, { tx: Transaction; fingerprint: string }>();
  private readonly entries: EntryInput[] = [];

  openAccount(account: AccountInput): void {
    if (this.accounts.has(account.id)) {
      throw new Error(`Account ${account.id} already exists`);
    }
    this.accounts.set(account.id, { ...account, currency: account.currency.toUpperCase() });
  }

  post(input: TransactionInput): Transaction {
    const existing = this.byKey.get(input.idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint(input)) {
        throw new Error(`Idempotency key ${input.idempotencyKey} was used for another transaction`);
      }
      return existing.tx;
    }

    this.validate(input);

    const tx: Transaction = Object.freeze({
      id: `tx_${this.transactions.size + 1}`,
      idempotencyKey: input.idempotencyKey,
      type: input.type,
      ...(input.reference === undefined ? {} : { reference: input.reference }),
      entries: Object.freeze(input.entries.map((e) => Object.freeze({ ...e }))),
    });
    this.transactions.set(tx.id, tx);
    this.byKey.set(tx.idempotencyKey, { tx, fingerprint: fingerprint(input) });
    this.entries.push(...tx.entries);
    return tx;
  }

  /** Posts the mirror image of a transaction; the original stays in the ledger. */
  reverse(transactionId: string, idempotencyKey: string): Transaction {
    const original = this.transactions.get(transactionId);
    if (!original) {
      throw new Error(`Unknown transaction ${transactionId}`);
    }
    return this.post({
      idempotencyKey,
      type: "reversal",
      reference: original.id,
      entries: original.entries.map((e) => ({
        ...e,
        direction: e.direction === "debit" ? "credit" : "debit",
      })),
    });
  }

  balance(accountId: string): Money {
    const account = this.account(accountId);
    const total = this.entries
      .filter((e) => e.accountId === accountId)
      .reduce((sum, e) => sum + (e.direction === account.normal ? 1 : -1) * e.amount.amount, 0);
    return money(total, account.currency);
  }

  entriesFor(accountId: string): readonly EntryInput[] {
    this.account(accountId);
    return this.entries.filter((e) => e.accountId === accountId);
  }

  private account(id: string): AccountInput {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`Unknown account ${id}`);
    }
    return account;
  }

  private validate(input: TransactionInput): void {
    if (input.entries.length < 2) {
      throw new Error("A transaction needs at least two entries");
    }
    const net = new Map<string, number>();
    for (const entry of input.entries) {
      const account = this.account(entry.accountId);
      if (entry.amount.currency !== account.currency) {
        throw new Error(
          `Entry currency ${entry.amount.currency} does not match account ${account.id} (${account.currency})`,
        );
      }
      if (entry.amount.amount <= 0) {
        throw new Error("Entry amounts must be positive");
      }
      const signed = entry.direction === "debit" ? entry.amount.amount : -entry.amount.amount;
      net.set(entry.amount.currency, (net.get(entry.amount.currency) ?? 0) + signed);
    }
    for (const [currency, total] of net) {
      if (total !== 0) {
        throw new UnbalancedTransactionError(currency);
      }
    }
  }
}
