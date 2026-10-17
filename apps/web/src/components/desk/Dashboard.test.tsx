import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Me } from "@/components/onboarding/MeGate";
import type { Plan } from "@/lib/savings-client";
import { forgetAll } from "@/lib/visit-cache";
import type { WalletTransaction } from "@/lib/wallet";
import {
  AccountCard,
  ActivityChart,
  Attention,
  NextCard,
  QuickActions,
  RecentTransactions,
  SavedCard,
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

describe("the summary cards", () => {
  it("adds up what is saved in plans still going, in the wallet's currency", () => {
    render(
      <SavedCard
        currency="NGN"
        plans={[
          plan(),
          plan({ id: "p2", saved: naira("2500000") }),
          plan({ id: "p3", status: "completed", saved: naira("9900000") }),
        ]}
      />,
    );
    const card = screen.getByRole("link", { name: /Saved in pots/ });
    expect(card).toHaveAttribute("href", "/save");
    expect(card).toHaveTextContent("₦100,000");
    expect(card).toHaveTextContent("2 active plans");
  });

  it("hides its figure when the balance is hidden", () => {
    localStorage.setItem("ajo-hide-balance", "1");
    render(<SavedCard currency="NGN" plans={[plan()]} />);
    expect(screen.getByText("Balance hidden")).toBeInTheDocument();
    expect(screen.queryByText("₦75,000")).toBeNull();
  });

  it("shows the next payment, or says nothing is due", () => {
    const { unmount } = render(
      <NextCard
        items={[
          {
            key: "plan-p1",
            date: "2026-10-26",
            title: "Rent for March",
            detail: "Saving payment",
            href: "/save/p1",
            amount: naira("2500000"),
            kind: "out",
          },
        ]}
      />,
    );
    const card = screen.getByRole("link", { name: /Next payment/ });
    expect(card).toHaveAttribute("href", "/save/p1");
    expect(card).toHaveTextContent("You pay");
    expect(card).toHaveTextContent("₦25,000");
    unmount();
    render(<NextCard items={[]} />);
    expect(screen.getByText("Nothing is due")).toBeInTheDocument();
  });

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
  it("shows the identity level, the second lock and devices", () => {
    render(<AccountCard me={me({ mfaEnabled: false })} />);
    expect(screen.getByRole("link", { name: /Authenticator app.*Off/ })).toHaveAttribute(
      "href",
      "/me/security",
    );
    expect(screen.getByRole("link", { name: /Devices and sign-ins/ })).toHaveAttribute(
      "href",
      "/me/devices",
    );
    expect(screen.getByRole("link", { name: /Identity level/ })).toHaveAttribute(
      "href",
      "/wallet/limits",
    );
  });
});

describe("recent transactions", () => {
  it("shows wallet payments only, as a table and a list, with a way to see them all", async () => {
    fetches({
      "/api/wallet/transactions": {
        items: [
          tx({}),
          tx({ id: "e2", type: "withdrawal", direction: "out", amount: naira("500000") }),
          tx({ id: "e3", type: "lock_deposit", account: "locked" }),
        ],
        next: null,
      },
    });
    render(<RecentTransactions />);
    const table = await screen.findByRole("table", { name: "Your latest wallet payments" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent(/Money added.*8d0f6a0e.*Money in.*₦15,500/);
    expect(rows[2]).toHaveTextContent(/Withdrawal.*Money out.*-₦5,000/);
    expect(
      within(screen.getByRole("list", { name: "Your latest wallet payments" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "All transactions" })).toHaveAttribute(
      "href",
      "/wallet/statements",
    );
  });

  it("has an empty state and an error state", async () => {
    fetches({ "/api/wallet/transactions": { items: [], next: null } });
    const { unmount } = render(<RecentTransactions />);
    expect(await screen.findByText(/No payments yet/)).toBeInTheDocument();
    unmount();
    fetches({});
    render(<RecentTransactions />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn't load"));
  });
});
