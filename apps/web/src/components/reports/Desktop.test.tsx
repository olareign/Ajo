import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CircleBoard } from "@/components/circles/CircleBoard";
import { CirclesProvider } from "@/components/circles/CirclesFlow";
import { DesktopNav } from "@/components/DesktopNav";
import { Landing } from "@/components/Landing";
import { Equivalents } from "@/components/wallet/Equivalents";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";
import { readFx } from "@/lib/fx";
import { InsightsScreen } from "./InsightsScreen";
import { StatementsScreen } from "./StatementsScreen";

const replace = vi.fn();
const router = { replace, push: vi.fn() };
let path = "/today";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => path,
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const me = { displayName: "Ada Ola", email: "a@b.co", onboarded: true, country: "NG", kycTier: 1 };
function api(routes: Record<string, () => unknown>) {
  const mock = vi.fn(async (url: string) => {
    const u = new URL(url, "http://app");
    if (u.pathname === "/api/me") return Response.json(me);
    if (u.pathname === "/api/wallet/rails")
      return Response.json({
        country: "NG",
        currency: "NGN",
        kycApproved: true,
        connected: { fund: true, mandate: true, withdraw: true },
      });
    const handler = routes[u.pathname];
    return handler ? Response.json(handler()) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("a balance in other currencies", () => {
  const fx = readFx({
    available: true,
    asOf: "2026-10-10T12:00:00Z",
    stale: false,
    sample: false,
    wallets: [
      {
        currency: "NGN",
        total: "150000",
        equivalents: [
          { currency: "GBP", amount: "75", rate: "0.0005" },
          { currency: "USD", amount: "100", rate: "0.0006" },
        ],
      },
    ],
  });

  it("shows each currency's estimate and says nothing was converted", () => {
    render(<Equivalents fx={fx} currency="NGN" hidden={false} />);
    expect(screen.getByLabelText("Worth about")).toHaveTextContent("≈ £0.75 · $1");
    expect(screen.getByText(/Estimate only; nothing is converted/)).toBeInTheDocument();
  });

  it("hides with the balance, labels sample rates, and shows nothing without rates", () => {
    const { rerender, container } = render(<Equivalents fx={fx} currency="NGN" hidden />);
    expect(screen.getByLabelText("Worth about")).toHaveTextContent("≈ ••••");
    expect(screen.queryByText(/0.75/)).toBeNull();
    rerender(
      <Equivalents fx={fx ? { ...fx, sample: true } : null} currency="NGN" hidden={false} />,
    );
    expect(screen.getByText(/Sample rates for testing/)).toBeInTheDocument();
    rerender(<Equivalents fx={null} currency="NGN" hidden={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("trusts nothing odd from the server", () => {
    expect(readFx({ available: false })).toBeNull();
    expect(
      readFx({ available: true, wallets: [{ currency: "naira", total: "1", equivalents: [] }] }),
    ).toBeNull();
  });
});

describe("the desktop sidebar", () => {
  it("shows inside the app, with statements and insights, and lights the closest section", () => {
    path = "/wallet/statements";
    render(<DesktopNav />);
    const nav = screen.getByRole("navigation", { name: "Desktop" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual([
      "Home",
      "Wallet",
      "Save",
      "Circles",
      "Friends",
      "Messages",
      "Statements",
      "Insights",
      "Me",
    ]);
    expect(within(nav).getByRole("link", { name: "Statements" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Wallet" })).not.toHaveAttribute("aria-current");
  });

  it("stays away from sign-in and the landing page", () => {
    for (const p of ["/sign-in", "/", "/join/ABCD"]) {
      path = p;
      const { container, unmount } = render(<DesktopNav />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});

const statement = {
  from: "2026-10-01",
  to: "2026-10-10",
  timeZone: "Africa/Lagos",
  truncated: false,
  balances: [
    { currency: "NGN", opening: "100000", closing: "300000", moneyIn: "250000", moneyOut: "50000" },
  ],
  lines: [
    {
      id: "1",
      at: "2026-10-02T09:00:00Z",
      type: "funding",
      account: "available",
      direction: "in",
      amount: "250000",
      currency: "NGN",
      reference: "ajf_1",
    },
    {
      id: "2",
      at: "2026-10-03T09:00:00Z",
      type: "withdrawal",
      account: "available",
      direction: "out",
      amount: "50000",
      currency: "NGN",
      reference: "ajw_1",
    },
  ],
};

describe("statements", () => {
  it("shows opening, in, out and closing, every line, and downloads a CSV of exactly those lines", async () => {
    const mock = api({ "/api/wallet/statement": () => statement });
    let csv = "";
    URL.createObjectURL = vi.fn((blob: Blob) => {
      void blob.text().then((t) => (csv = t));
      return "blob:statement";
    });
    URL.revokeObjectURL = vi.fn();
    const user = userEvent.setup();
    render(<StatementsScreen />);
    const summary = await screen.findByRole("region", { name: /Naira summary/ });
    expect(summary).toHaveTextContent("Opening");
    expect(summary).toHaveTextContent("₦3,000");
    expect(screen.getAllByText("2 lines, 2026-10-01 to 2026-10-10").length).toBe(1);
    const asked = new URL(
      mock.mock.calls.find(([u]) => String(u).startsWith("/api/wallet/statement"))![0] as string,
      "http://app",
    );
    expect(asked.searchParams.get("from")).toMatch(/^\d{4}-\d{2}-01$/);
    await user.click(screen.getByRole("button", { name: /Download CSV/ }));
    await waitFor(() => expect(csv).toContain("Date,Time,Description"));
    expect(csv.trim().split("\r\n")).toHaveLength(3);
  });

  it("changes the range from the chips, and says so when there's nothing", async () => {
    const mock = api({
      "/api/wallet/statement": () => ({ ...statement, balances: [], lines: [] }),
    });
    const user = userEvent.setup();
    render(<StatementsScreen />);
    expect(await screen.findByText(/No money has moved/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Last month" }));
    await waitFor(() =>
      expect(
        mock.mock.calls.filter(([u]) => String(u).startsWith("/api/wallet/statement")),
      ).toHaveLength(2),
    );
    expect(screen.getByRole("button", { name: /Download CSV/ })).toBeDisabled();
  });
});

const month = (m: string, over: object = {}) => ({
  month: m,
  currency: "NGN",
  moneyIn: "0",
  moneyOut: "0",
  savedNet: "0",
  endAvailable: "0",
  endSavings: "0",
  endLocked: "0",
  ...over,
});

describe("insights", () => {
  it("leads with this month's figures, draws both charts, and offers the numbers as a table", async () => {
    api({
      "/api/wallet/insights": () => ({
        months: [
          month("2026-09", { moneyIn: "100000", moneyOut: "20000", endSavings: "50000" }),
          month("2026-10", {
            moneyIn: "250000",
            moneyOut: "50000",
            savedNet: "30000",
            endSavings: "80000",
          }),
        ],
      }),
    });
    render(<InsightsScreen />);
    const now = await screen.findByRole("region", { name: /This month, Oct 2026/ });
    expect(now).toHaveTextContent("₦2,500");
    expect(
      screen.getByRole("img", { name: "Money in and money out by month" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Saved in plans at the end of each month" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("Money inMoney out");
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("says nothing is saved yet instead of drawing a flat line", async () => {
    api({ "/api/wallet/insights": () => ({ months: [month("2026-10", { moneyIn: "100" })] }) });
    render(<InsightsScreen />);
    expect(
      await screen.findByText(/Nothing saved in plans in this period yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Saved in plans at the end of each month" }),
    ).toBeNull();
  });

  it("says so plainly when there is nothing yet", async () => {
    api({ "/api/wallet/insights": () => ({ months: [] }) });
    render(<InsightsScreen />);
    expect(await screen.findByText(/Nothing to show yet/)).toBeInTheDocument();
  });
});

describe("the circle board", () => {
  it("lays out every member against every round, in words, and marks who was paid out", async () => {
    const money = (amount: string) => ({ amount, currency: "NGN" });
    const people = [
      { username: "chidi_o", displayName: "Chidi", spot: 1 },
      { username: "you", displayName: "Ada", spot: 2 },
    ];
    api({
      "/api/groups/g1": () => ({
        id: "g1",
        name: "Cousins",
        community: null,
        status: "running",
        currency: "NGN",
        contribution: "100000",
        frequency: "monthly",
        size: 2,
        memberCount: 2,
        startDate: "2026-09-01",
        orderMethod: "join_order",
        visibility: "private",
        pot: "200000",
        creator: { username: "you", displayName: "Ada" },
        isMember: true,
        isCreator: true,
        mySpot: 2,
        friendsIn: 0,
        inviteCode: null,
        rules: {
          deposit: money("0"),
          earlyDeposit: money("0"),
          earlySpots: 0,
          feeBps: 0,
          lateFeeBps: 0,
          graceDays: 2,
        },
        members: people.map((p) => ({
          ...p,
          isYou: p.username === "you",
          isCreator: p.username === "you",
          trust: { level: "new", score: 0 },
          current: null,
        })),
        rounds: [
          {
            roundNo: 1,
            dueOn: "2026-09-01",
            recipient: "chidi_o",
            recipientName: "Chidi",
            isYours: false,
            status: "paid_out",
            payout: money("200000"),
            fee: money("0"),
            paid: 2,
            yours: "paid",
            board: [
              { username: "chidi_o", displayName: "Chidi", status: "paid" },
              { username: "you", displayName: "Ada", status: "late" },
            ],
          },
          {
            roundNo: 2,
            dueOn: "2026-10-01",
            recipient: "you",
            recipientName: "Ada",
            isYours: true,
            status: "scheduled",
            payout: null,
            fee: null,
            paid: 1,
            yours: "scheduled",
            board: [
              { username: "chidi_o", displayName: "Chidi", status: "missed" },
              { username: "you", displayName: "Ada", status: "scheduled" },
            ],
          },
        ],
        draws: [],
        myDeposit: null,
        pickDeadline: null,
        nextDue: null,
        graceDays: 2,
      }),
    });
    render(
      <MoneyFlow>
        <CirclesProvider>
          <CircleBoard id="g1" />
        </CirclesProvider>
      </MoneyFlow>,
    );
    const table = await screen.findByRole("table", { name: "Payments by member and round" });
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]!).getByRole("rowheader")).toHaveTextContent("Chidi");
    expect(rows[1]).toHaveTextContent("PaidMissed");
    expect(rows[2]).toHaveTextContent("Paid lateWaiting");
    expect(within(rows[1]!).getAllByLabelText("Paid out this round")).toHaveLength(1);
    expect(rows[3]).toHaveTextContent("2 of 2");
  });
});

describe("the landing page", () => {
  it("leads with saving together safely, explains circles and safety, and has both ways in", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Save together, safely.");
    expect(screen.getByRole("heading", { name: "How a circle works" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no one is left out of pocket/ }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /Get started|Create your account/ })
        .every((l) => l.getAttribute("href") === "/sign-up"),
    ).toBe(true);
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});
