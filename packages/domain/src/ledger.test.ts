import { beforeEach, describe, expect, it } from "vitest";
import { Ledger, UnbalancedTransactionError, type EntryInput } from "./ledger";
import { money } from "./money";

const debit = (accountId: string, amount: number, currency = "NGN"): EntryInput => ({
  accountId,
  direction: "debit",
  amount: money(amount, currency),
});
const credit = (accountId: string, amount: number, currency = "NGN"): EntryInput => ({
  accountId,
  direction: "credit",
  amount: money(amount, currency),
});

describe("Ledger", () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger();
    // Àjọ's view: money it owes users is credit-normal; money held at the partner is debit-normal.
    ledger.openAccount({ id: "partner:NGN", currency: "NGN", normal: "debit" });
    ledger.openAccount({ id: "ada:available:NGN", currency: "NGN", normal: "credit" });
    ledger.openAccount({ id: "ada:locked:NGN", currency: "NGN", normal: "credit" });
    ledger.openAccount({ id: "partner:GBP", currency: "GBP", normal: "debit" });
  });

  it("starts every account at zero", () => {
    expect(ledger.balance("ada:available:NGN")).toEqual(money(0, "NGN"));
  });

  it("derives balances from entries when a wallet is funded", () => {
    ledger.post({
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 1_000_000), credit("ada:available:NGN", 1_000_000)],
    });

    expect(ledger.balance("partner:NGN")).toEqual(money(1_000_000, "NGN"));
    expect(ledger.balance("ada:available:NGN")).toEqual(money(1_000_000, "NGN"));
  });

  it("moves money between a user's own accounts, e.g. locking a deposit", () => {
    ledger.post({
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 1_000_000), credit("ada:available:NGN", 1_000_000)],
    });
    ledger.post({
      idempotencyKey: "lock-1",
      type: "deposit_lock",
      entries: [debit("ada:available:NGN", 400_000), credit("ada:locked:NGN", 400_000)],
    });

    expect(ledger.balance("ada:available:NGN")).toEqual(money(600_000, "NGN"));
    expect(ledger.balance("ada:locked:NGN")).toEqual(money(400_000, "NGN"));
  });

  it("rejects a transaction whose debits and credits differ", () => {
    expect(() =>
      ledger.post({
        idempotencyKey: "bad",
        type: "wallet_funding",
        entries: [debit("partner:NGN", 1_000), credit("ada:available:NGN", 999)],
      }),
    ).toThrow(UnbalancedTransactionError);
    expect(ledger.balance("partner:NGN")).toEqual(money(0, "NGN"));
  });

  it("checks the balance per currency, never across currencies", () => {
    ledger.openAccount({ id: "ada:available:GBP", currency: "GBP", normal: "credit" });
    expect(() =>
      ledger.post({
        idempotencyKey: "mixed",
        type: "wallet_funding",
        entries: [debit("partner:NGN", 100), credit("ada:available:GBP", 100, "GBP")],
      }),
    ).toThrow(UnbalancedTransactionError);
  });

  it("rejects an entry whose currency differs from its account", () => {
    expect(() =>
      ledger.post({
        idempotencyKey: "wrong-currency",
        type: "wallet_funding",
        entries: [debit("partner:NGN", 100, "GBP"), credit("partner:GBP", 100, "GBP")],
      }),
    ).toThrow(/currency/i);
  });

  it("needs at least two entries", () => {
    expect(() =>
      ledger.post({ idempotencyKey: "one", type: "x", entries: [debit("partner:NGN", 0)] }),
    ).toThrow(/two entries/i);
  });

  it("only accepts positive amounts", () => {
    expect(() =>
      ledger.post({
        idempotencyKey: "zero",
        type: "x",
        entries: [debit("partner:NGN", 0), credit("ada:available:NGN", 0)],
      }),
    ).toThrow(/positive/i);
  });

  it("rejects entries for unknown accounts", () => {
    expect(() =>
      ledger.post({
        idempotencyKey: "ghost",
        type: "x",
        entries: [debit("partner:NGN", 1), credit("ghost", 1)],
      }),
    ).toThrow(/unknown account/i);
    expect(() => ledger.balance("ghost")).toThrow(/unknown account/i);
  });

  it("refuses to open the same account twice", () => {
    expect(() => ledger.openAccount({ id: "partner:NGN", currency: "NGN", normal: "debit" })).toThrow(
      /already exists/i,
    );
  });

  it("is idempotent: replaying the same key does not post twice", () => {
    const tx = {
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 500), credit("ada:available:NGN", 500)],
    };
    const first = ledger.post(tx);
    const second = ledger.post(tx);

    expect(second).toBe(first);
    expect(ledger.balance("ada:available:NGN")).toEqual(money(500, "NGN"));
  });

  it("rejects reusing a key for a different transaction", () => {
    ledger.post({
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 500), credit("ada:available:NGN", 500)],
    });
    expect(() =>
      ledger.post({
        idempotencyKey: "fund-1",
        type: "wallet_funding",
        entries: [debit("partner:NGN", 900), credit("ada:available:NGN", 900)],
      }),
    ).toThrow(/idempotency key/i);
  });

  it("returns posted transactions as immutable records", () => {
    const tx = ledger.post({
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 500), credit("ada:available:NGN", 500)],
    });
    expect(Object.isFrozen(tx)).toBe(true);
    expect(Object.isFrozen(tx.entries)).toBe(true);
  });

  it("corrects mistakes with a reversing transaction, never by editing", () => {
    const original = ledger.post({
      idempotencyKey: "fund-1",
      type: "wallet_funding",
      entries: [debit("partner:NGN", 500), credit("ada:available:NGN", 500)],
    });
    ledger.reverse(original.id, "reverse-fund-1");

    expect(ledger.balance("ada:available:NGN")).toEqual(money(0, "NGN"));
    expect(ledger.entriesFor("ada:available:NGN")).toHaveLength(2);
  });

  it("cannot reverse a transaction that does not exist", () => {
    expect(() => ledger.reverse("nope", "k")).toThrow(/unknown transaction/i);
  });
});
