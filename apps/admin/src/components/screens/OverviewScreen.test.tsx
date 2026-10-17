import { render, screen, within } from "@testing-library/react";
import { AdminContext } from "@/components/AdminProvider";
import type { Dashboard, Me } from "@/lib/types";
import { OverviewScreen } from "./OverviewScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());

const days = Array.from({ length: 30 }, (_, i) => ({
  day: `2026-09-${String(i + 1).padStart(2, "0")}`.replace("2026-09-31", "2026-10-01"),
  count: i === 29 ? 2 : 0,
}));
const board: Dashboard = {
  days: 30,
  people: {
    total: 40,
    active: 38,
    suspended: 2,
    joinedInPeriod: 2,
    byCountry: [
      { country: "NG", count: 30 },
      { country: "GB", count: 10 },
    ],
    signups: days,
  },
  work: { pendingKyc: 3, openCases: 1, failedPayments: 4, stuckPayments: 0 },
  money: [{ currency: "NGN", held: "12500000000", moneyIn: "350000000", moneyOut: "35000000" }],
  flow: [{ day: days[29]!.day, currency: "NGN", moneyIn: "350000000", moneyOut: "35000000" }],
  circles: { open: 2, picking: 0, running: 5, completed: 1 },
  plans: { active: 7, paused: 1, completed: 3 },
  recent: [
    {
      id: "p1",
      userId: "3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b",
      kind: "funding",
      status: "succeeded",
      amount: "500000",
      currency: "NGN",
      createdAt: "2026-10-16T10:00:00Z",
    },
  ],
};
const staff = (permissions: string[]): Me =>
  ({ id: "m1", email: "ada@ajo.test", name: "Ada Staff", role: "support", permissions }) as Me;
function show(me: Me) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(board)),
  );
  return render(
    <AdminContext.Provider value={me}>
      <OverviewScreen />
    </AdminContext.Provider>,
  );
}

describe("the dashboard", () => {
  it("leads with people, money held, money in and circles, over 30 days", async () => {
    show(staff(["overview:read", "users:read", "kyc:read", "cases:read"]));
    expect(await screen.findByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("+2 in 30 days · 2 suspended")).toBeInTheDocument();
    expect(screen.getByText("₦125M")).toBeInTheDocument();
    expect(screen.getByText("₦3.5M")).toBeInTheDocument();
    expect(screen.getByText("2 filling · 1 finished").parentElement).toHaveTextContent("5");
  });

  it("lists what is waiting, linking only to what the role can open", async () => {
    show(staff(["overview:read", "kyc:read"]));
    const waiting = await screen.findByRole("region", { name: "Waiting on the team" });
    expect(within(waiting).getByText("8 to look at")).toBeInTheDocument();
    expect(within(waiting).getByRole("link", { name: /Identity checks/ })).toHaveAttribute(
      "href",
      "/kyc",
    );
    expect(within(waiting).queryByRole("link", { name: /recovery cases/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open person" })).toBeNull();
  });

  it("shows money in and out with a legend and a table, and people by country", async () => {
    show(staff(["overview:read", "users:read"]));
    const flow = await screen.findByRole("region", { name: "Money in and out" });
    expect(within(flow).getByText("Money in")).toBeInTheDocument();
    expect(within(flow).getByText("Money out")).toBeInTheDocument();
    expect(
      within(flow).getByRole("table", { name: /Money in and out by day/ }),
    ).toBeInTheDocument();
    const where = screen.getByRole("region", { name: "Where people are" });
    expect(within(where).getByText("Nigeria")).toBeInTheDocument();
    expect(within(where).getByText("30 · 75%")).toBeInTheDocument();
  });

  it("lists the latest payments with exact amounts and no names or emails", async () => {
    show(staff(["overview:read", "users:read"]));
    const recent = await screen.findByRole("region", { name: "Latest payments" });
    expect(within(recent).getByText("₦5,000.00")).toBeInTheDocument();
    expect(within(recent).getByRole("link", { name: "Open person" })).toHaveAttribute(
      "href",
      "/users/3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b",
    );
    expect(recent).not.toHaveTextContent("@");
  });
});
