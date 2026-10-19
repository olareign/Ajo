import { render, screen, within } from "@testing-library/react";
import type { GroupDetail, GroupSummary } from "@/lib/groups-client";
import type { Plan } from "@/lib/savings-client";
import { forgetAll } from "@/lib/visit-cache";
import { MonthPanel } from "./MonthPanel";
import { CirclesPanel, SavingsPanel, UpNext } from "./TodayDesk";

afterEach(() => {
  vi.unstubAllGlobals();
  forgetAll();
});

const naira = (amount: string) => ({ amount, currency: "NGN" });
const plan = (over: Partial<Plan> = {}): Plan =>
  ({
    id: "p1",
    name: "Rent for March",
    status: "active",
    frequency: "weekly",
    amount: naira("2500000"),
    totalDebits: 12,
    startDate: "2026-10-19",
    endDate: "2027-01-04",
    saved: naira("7500000"),
    target: naira("30000000"),
    paidDebits: 3,
    failedDebits: 0,
    nextDebit: { dueOn: "2026-10-26", amount: naira("2500000") },
    topupFromBank: false,
    payout: null,
    penalty: naira("0"),
    createdAt: "2026-10-01T00:00:00Z",
    closedAt: null,
    ...over,
  }) as Plan;
const group = (over: Partial<GroupSummary> = {}): GroupSummary =>
  ({
    id: "g1",
    name: "Lekki cousins",
    community: null,
    status: "running",
    currency: "NGN",
    contribution: "5000000",
    frequency: "monthly",
    size: 3,
    memberCount: 3,
    startDate: "2026-10-22",
    orderMethod: "join_order",
    visibility: "private",
    pot: "15000000",
    creator: { username: "ada", displayName: "Ada" },
    isMember: true,
    isCreator: true,
    mySpot: 2,
    friendsIn: 2,
    inviteCode: null,
    ...over,
  }) as GroupSummary;

describe("up next", () => {
  it("puts saving payments, circle payments and the day the pot is yours in date order", async () => {
    const detail = {
      ...group(),
      nextDue: { roundNo: 1, dueOn: "2026-10-22" },
      rounds: [
        { roundNo: 1, dueOn: "2026-10-22", isYours: false, status: "scheduled" },
        { roundNo: 2, dueOn: "2026-11-22", isYours: true, status: "scheduled" },
      ],
    } as unknown as GroupDetail;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(detail)),
    );
    render(<UpNext plans={[plan()]} groups={[group()]} />);
    const list = await screen.findByRole("list");
    await screen.findByText("Round 2: the pot is yours · Sun");
    const rows = within(list)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(rows[0]).toMatch(/Lekki cousins.*Round 1 payment.*₦50,000/);
    expect(rows[1]).toMatch(/Rent for March.*Saving payment.*₦25,000/);
    expect(rows[2]).toMatch(/the pot is yours.*₦150,000/);
  });

  it("says plainly when nothing is due, and asks nothing for circles that aren't running", () => {
    const asked = vi.fn();
    vi.stubGlobal("fetch", asked);
    render(<UpNext plans={[plan({ nextDebit: null })]} groups={[group({ status: "open" })]} />);
    expect(screen.getByText(/Nothing is due/)).toBeInTheDocument();
    expect(asked).not.toHaveBeenCalled();
  });
});

describe("pots and circles on a desk", () => {
  it("shows each pot with how full it is", () => {
    render(<SavingsPanel plans={[plan()]} />);
    expect(screen.getByText("3 of 12 payments")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Rent for March: 25% saved" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });

  it("offers one way to begin when there are no pots or circles", () => {
    render(<SavingsPanel plans={[]} />);
    expect(screen.getByRole("link", { name: /Start a plan/ })).toHaveAttribute("href", "/save/new");
    render(<CirclesPanel groups={[]} />);
    expect(screen.getByRole("link", { name: /Start a circle/ })).toHaveAttribute(
      "href",
      "/circles/new",
    );
  });

  it("shows each circle's state, how full it is, your turn and its pot", () => {
    render(<CirclesPanel groups={[group(), group({ id: "g2", status: "completed" })]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/Running · 3 of 3 people · your turn: 2/)).toBeInTheDocument();
    expect(screen.getByText("₦150,000")).toBeInTheDocument();
  });
});

describe("this month beside the balance", () => {
  it("leads with money in and out, and lists only payments in or out of the wallet", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const tx = (id: string, account: string, direction: string, amount: string) => ({
      id,
      transactionId: `t-${id}`,
      type: "lock_deposit",
      account,
      direction,
      amount: naira(amount),
      currency: "NGN",
      createdAt: "2026-10-17T02:43:00Z",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.startsWith("/api/wallet/insights")
          ? Response.json({
              months: [
                {
                  month: "2026-10",
                  currency: "NGN",
                  moneyIn: "6250000",
                  moneyOut: "3500000",
                  savedNet: "0",
                  endAvailable: "27750000",
                  endSavings: "0",
                  endLocked: "0",
                },
              ],
            })
          : Response.json({
              items: [tx("a", "available", "out", "10000000"), tx("b", "locked", "in", "10000000")],
              next: null,
            }),
      ),
    );
    render(<MonthPanel currency="NGN" recent balance={false} />);
    expect(await screen.findByText("₦62,500")).toBeInTheDocument();
    expect(screen.getByText("₦35,000")).toBeInTheDocument();
    expect(screen.queryByText("In your wallet")).toBeNull();
    const latest = await screen.findByRole("list", { name: "Latest payments" });
    expect(within(latest).getAllByRole("listitem")).toHaveLength(1);
  });
});
