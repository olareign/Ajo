import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Me } from "@/components/onboarding/MeGate";
import type { Plan } from "@/lib/savings-client";
import { forgetAll } from "@/lib/visit-cache";
import type { WalletTransaction } from "@/lib/wallet";
import {
  AccountStrip,
  ActivityChart,
  Attention,
  BalanceHero,
  filterHistory,
  historyCsv,
  QuickActions,
  TransactionHistory,
} from "./Dashboard";

afterEach(() => {
  vi.unstubAllGlobals();
  forgetAll();
  try {
    localStorage.clear();
  } catch {
    // Nothing stored.
  }
});

/** Answers each API path with its body; anything else fails, as a broken server would. */
const fetches = (routes: Record<string, unknown>) => {
  const mock = vi.fn(async (url: string) => {
    const path = url.split("?")[0]!;
    return path in routes
      ? Response.json(routes[path])
      : Response.json({ message: "nope" }, { status: 500 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};

const naira = (amount: string) => ({ amount, currency: "NGN" });
const plan = (over: Partial<Plan> = {}): Plan =>
  ({
    id: "p1",
    name: "Rent for March",
    status: "active",
    saved: naira("7500000"),
    nextDebit: { dueOn: "2026-10-26", amount: naira("2500000") },
    ...over,
  }) as Plan;
const me = (over: Partial<Me> = {}): Me =>
  ({
    displayName: "Ada Okafor",
    country: "NG",
    kycStatus: "approved",
    kycTier: 1,
    mfaEnabled: true,
    ...over,
  }) as Me;
const month = (m: string, moneyIn: string, moneyOut: string) => ({
  month: m,
  currency: "NGN",
  moneyIn,
  moneyOut,
  savedNet: "0",
  endAvailable: "0",
  endSavings: "0",
  endLocked: "0",
});
const tx = (over: Partial<WalletTransaction>): WalletTransaction => ({
  id: "e1",
  transactionId: "8d0f6a0e-1111-4c2b-9a77-1234567890ab",
  type: "funding",
  account: "available",
  direction: "in",
  amount: naira("1550000"),
  currency: "NGN",
  createdAt: "2026-10-06T13:48:00Z",
  ...over,
});

const wallet = {
  currency: "NGN",
  available: naira("27750000"),
  locked: naira("15000000"),
  savings: naira("0"),
};
const due = {
  key: "plan-p1",
  date: "2026-10-26",
  title: "Rent for March",
  detail: "Saving payment",
  href: "/save/p1",
  amount: naira("2500000"),
  kind: "out" as const,
};

describe("the balance card", () => {
  it("shows what is available, what is in pots, the next payment and both money moves", () => {
    render(
      <BalanceHero
        wallets={[wallet] as never}
        currency="NGN"
        fx={null}
        plans={[
          plan(),
          plan({ id: "p2", saved: naira("2500000") }),
          plan({ id: "p3", status: "completed" }),
        ]}
        upcoming={[due]}
      />,
    );
    const card = screen.getByRole("region", { name: "Your balance" });
    expect(within(card).getByText("₦277,500")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /In pots.*₦100,000/ })).toHaveAttribute(
      "href",
      "/save",
    );
    expect(
      within(card).getByRole("link", { name: /Next payment.*You pay.*₦25,000/ }),
    ).toHaveAttribute("href", "/save/p1");
    const moves = within(card).getByRole("navigation", { name: "Move money" });
    expect(
      within(moves).getByRole("link", { name: /Add money.*From your bank or card/ }),
    ).toHaveAttribute("href", "/wallet/add");
    expect(
      within(moves).getByRole("link", { name: /Withdraw.*To your bank account/ }),
    ).toHaveAttribute("href", "/wallet/withdraw");
  });

  it("says nothing is due when nothing is, and hides every figure behind the eye", async () => {
    const user = userEvent.setup();
    render(
      <BalanceHero
        wallets={[wallet] as never}
        currency="NGN"
        fx={null}
        plans={[plan()]}
        upcoming={[]}
      />,
    );
    expect(screen.getByText("Nothing due")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide balance" }));
    expect(screen.queryByText("₦277,500")).toBeNull();
    expect(screen.queryByText("₦75,000")).toBeNull();
    expect(screen.getAllByText("Balance hidden").length).toBeGreaterThanOrEqual(2);
  });
});

describe("quick actions", () => {
  it("offers four quick actions that each lead somewhere real", () => {
    render(<QuickActions />);
    const links = within(screen.getByRole("navigation", { name: "Quick actions" })).getAllByRole(
      "link",
    );
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/save/new",
      "/circles/new",
      "/wallet/mandate",
      "/wallet/statements",
    ]);
  });
});

describe("money in and out", () => {
  it("loads six months, and reloads the chart and totals when another period is chosen", async () => {
    const asked = fetches({
      "/api/wallet/insights": { months: [month("2026-09", "1000000", "400000")] },
    });
    const user = userEvent.setup();
    render(<ActivityChart currency="NGN" locale="en-NG" />);
    expect(await screen.findByText("₦10,000", { selector: "dd *" })).toBeInTheDocument();
    // What was kept (in less out) and the busiest month sit beside the two totals.
    expect(screen.getByText("Kept").closest("div")).toHaveTextContent("₦6,000");
    expect(screen.getByText("Busiest month").closest("div")).toHaveTextContent("Sept 2026");
    expect(asked).toHaveBeenCalledWith(
      expect.stringContaining("/api/wallet/insights?months=6"),
      expect.anything(),
    );
    expect(screen.getByRole("radio", { name: "6 months" })).toHaveAttribute("aria-checked", "true");

    fetches({
      "/api/wallet/insights": {
        months: [month("2026-08", "500000", "0"), month("2026-09", "1000000", "400000")],
      },
    });
    await user.click(screen.getByRole("radio", { name: "12 months" }));
    expect(screen.getByRole("radio", { name: "12 months" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(await screen.findByText("₦15,000", { selector: "dd *" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Money in and out by month" })).toHaveTextContent(
      "Aug",
    );
  });

  it("says so when nothing moved, and when the chart can't load", async () => {
    fetches({ "/api/wallet/insights": { months: [month("2026-09", "0", "0")] } });
    const { unmount } = render(<ActivityChart currency="NGN" locale="en-NG" />);
    expect(await screen.findByText(/No money has moved in this period/)).toBeInTheDocument();
    unmount();
    fetches({});
    render(<ActivityChart currency="NGN" locale="en-NG" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The chart couldn't load");
  });
});

describe("needs your attention", () => {
  it("lists unfinished set-up and unread notifications, newest three", async () => {
    const notice = (id: string, readAt: string | null = null) => ({
      id,
      kind: "x",
      title: `Notice ${id}`,
      body: "",
      link: null,
      createdAt: "2026-10-16T10:00:00Z",
      readAt,
    });
    fetches({
      "/api/notifications": {
        items: [
          notice("1"),
          notice("2", "2026-10-16T11:00:00Z"),
          notice("3"),
          notice("4"),
          notice("5"),
        ],
        next: null,
        unread: 4,
      },
    });
    render(<Attention me={me({ mfaEnabled: false })} />);
    expect(screen.getByRole("link", { name: /Add a second lock/ })).toHaveAttribute(
      "href",
      "/me/security",
    );
    await screen.findByText("Notice 1");
    expect(screen.queryByText("Notice 2")).toBeNull();
    expect(screen.getByText("Notice 4")).toBeInTheDocument();
    expect(screen.queryByText("Notice 5")).toBeNull();
  });

  it("says you're all caught up when nothing needs you", async () => {
    fetches({ "/api/notifications": { items: [], next: null, unread: 0 } });
    render(<Attention me={me()} />);
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });
});

describe("account and security", () => {
  it("shows the identity level, the second lock and devices in one line, and leads to Settings", () => {
    render(<AccountStrip me={me({ mfaEnabled: false })} />);
    expect(screen.getByRole("link", { name: /Authenticator app.*Off/ })).toHaveAttribute(
      "href",
      "/me/security",
    );
    expect(screen.getByRole("link", { name: /Devices and sign-ins/ })).toHaveAttribute(
      "href",
      "/me/devices",
    );
    expect(screen.getByRole("link", { name: /Identity level.*Passport stamped/ })).toHaveAttribute(
      "href",
      "/wallet/limits",
    );
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/settings");
  });
});

describe("transaction history", () => {
  const NOW = new Date("2026-10-21T12:00:00Z");
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  const list = [
    tx({
      id: "a",
      createdAt: "2026-10-17T07:05:00Z",
      type: "withdrawal",
      direction: "out",
      amount: naira("3500000"),
    }),
    tx({ id: "b", createdAt: "2026-10-15T07:05:00Z", transactionId: "a5a60111-x" }),
    tx({ id: "c", createdAt: "2026-10-17T07:05:00Z", type: "lock_deposit", account: "locked" }),
    tx({ id: "d", createdAt: "2026-08-01T07:05:00Z", transactionId: "old-one" }),
  ];

  it("narrows by words, type, account and how far back", () => {
    const at = NOW.getTime();
    const ids = (f: Parameters<typeof filterHistory>[1]) =>
      filterHistory(list, f, at).map((t) => t.id);
    const any = { text: "", direction: "", account: "", range: "all" } as const;
    expect(ids(any)).toEqual(["a", "b", "c", "d"]);
    expect(ids({ ...any, range: "30d" })).toEqual(["a", "b", "c"]);
    expect(ids({ ...any, direction: "out" })).toEqual(["a"]);
    expect(ids({ ...any, account: "locked" })).toEqual(["c"]);
    expect(ids({ ...any, text: "A5A6" })).toEqual(["b"]);
    expect(ids({ ...any, text: "withdrawal" })).toEqual(["a"]);
  });

  it("writes exactly what is shown as a spreadsheet, money out negative", () => {
    const csv = historyCsv([list[0]!, list[1]!]).trim().split("\r\n");
    expect(csv[0]).toBe("Date,Time,Description,Reference,Account,Type,Amount,Currency");
    expect(csv[1]).toContain("Withdrawal");
    expect(csv[1]).toContain("-35000.00,NGN");
    expect(csv[2]).toContain("Money added");
    expect(csv[2]).toContain("15500.00,NGN");
  });

  it("shows the last 30 days as a table, filters with chips that undo themselves, and clears", async () => {
    fetches({ "/api/wallet/transactions": { items: list, next: null } });
    const user = userEvent.setup({ advanceTimers: () => undefined });
    render(<TransactionHistory />);
    const table = await screen.findByRole("table", { name: "Transaction history" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("Showing 1–3 of 3 payments")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Type"), "out");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table).toHaveTextContent("Withdrawal");
    await user.click(screen.getByRole("button", { name: "Remove filter: Money out" }));
    expect(within(table).getAllByRole("row")).toHaveLength(4);

    await user.type(screen.getByLabelText("Search"), "nothing like this");
    expect(await screen.findByText("No payments match these filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 1–4 of 4 payments")).toBeInTheDocument();
  });

  it("fetches older payments when Next is pressed on the last page loaded", async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      tx({ id: `n${i}`, createdAt: `2026-10-${String(20 - i).padStart(2, "0")}T07:00:00Z` }),
    );
    const older = [
      tx({ id: "older", createdAt: "2026-10-05T07:00:00Z", type: "withdrawal", direction: "out" }),
    ];
    const asked = vi.fn(async (url: string) =>
      Response.json(
        url.includes("before=c1") ? { items: older, next: null } : { items: many, next: "c1" },
      ),
    );
    vi.stubGlobal("fetch", asked);
    const user = userEvent.setup({ advanceTimers: () => undefined });
    render(<TransactionHistory />);
    expect(await screen.findByText("Showing 1–10 of 10+ payments")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Showing 11–11 of 11 payments")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("Withdrawal");
    expect(asked).toHaveBeenCalledWith(expect.stringContaining("before=c1"), expect.anything());
  });

  it("has an empty state and an error state", async () => {
    fetches({ "/api/wallet/transactions": { items: [], next: null } });
    const { unmount } = render(<TransactionHistory />);
    expect(await screen.findByText(/No payments yet/)).toBeInTheDocument();
    unmount();
    fetches({});
    render(<TransactionHistory />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn't load"));
  });
});
