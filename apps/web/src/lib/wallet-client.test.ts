import { loadTransactions, loadWallets } from "./wallet-client";

const answer = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
afterEach(() => vi.unstubAllGlobals());

const money = (amount: string) => ({ amount, currency: "NGN" });
const wallet = {
  currency: "NGN",
  available: money("250000"),
  locked: money("0"),
  savings: money("0"),
};

describe("loadWallets", () => {
  it("returns the wallets", async () => {
    answer(200, { wallets: [wallet] });
    expect(await loadWallets()).toEqual({ status: "ok", data: [wallet] });
  });

  it("says the person is signed out on a 401", async () => {
    answer(401, { message: "Please sign in." });
    expect(await loadWallets()).toEqual({ status: "signed-out" });
  });

  it.each([
    ["a server error", () => answer(502, { message: "x" })],
    ["an answer of the wrong shape", () => answer(200, { wallets: "none" })],
    [
      "no connection",
      () =>
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => Promise.reject(new Error("offline"))),
        ),
    ],
  ])("fails on %s", async (_name, arrange) => {
    arrange();
    expect(await loadWallets()).toEqual({ status: "failed" });
  });
});

describe("loadTransactions", () => {
  const page = { items: [], next: null };

  it("asks for the first page with a page size, and for later pages with the cursor", async () => {
    answer(200, page);
    await loadTransactions();
    await loadTransactions("4521");
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "/api/wallet/transactions?limit=20",
      "/api/wallet/transactions?limit=20&before=4521",
    ]);
  });

  it("returns the page and the cursor for the next one", async () => {
    answer(200, { items: [], next: "77" });
    expect(await loadTransactions()).toEqual({ status: "ok", data: { items: [], next: "77" } });
  });

  it("says the person is signed out on a 401, and fails on a bad answer", async () => {
    answer(401);
    expect(await loadTransactions()).toEqual({ status: "signed-out" });
    answer(200, { items: {}, next: null });
    expect(await loadTransactions()).toEqual({ status: "failed" });
  });
});
