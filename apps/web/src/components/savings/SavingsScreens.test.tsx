import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { addDays, todayIn } from "@/lib/schedule";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";
import { NewPlan } from "./NewPlan";
import { PlanScreen } from "./PlanScreen";
import { SavingsHome } from "./SavingsHome";
import { SavingsProvider } from "./SavingsFlow";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => query }));

const me = { displayName: "Ada Ola", email: "a@b.co", onboarded: true, country: "NG", kycTier: 1 };
const rails = (over: Partial<Rails> = {}): Rails => ({
  country: "NG",
  currency: "NGN",
  kycApproved: true,
  connected: { fund: true, mandate: true, withdraw: true },
  ...over,
});
const naira = (amount: string) => ({ amount, currency: "NGN" });
const today = todayIn("NGN");

const planRow = (over: object = {}) => ({
  id: "p1",
  name: "Rent",
  status: "active",
  frequency: "weekly",
  amount: naira("500000"),
  totalDebits: 4,
  startDate: today,
  endDate: addDays(today, 21),
  saved: naira("500000"),
  target: naira("2000000"),
  paidDebits: 1,
  failedDebits: 0,
  nextDebit: { dueOn: addDays(today, 7), amount: naira("500000") },
  topupFromBank: false,
  payout: null,
  penalty: naira("0"),
  createdAt: "2026-10-04T10:00:00.000Z",
  closedAt: null,
  ...over,
});
const detail = (over: object = {}) => ({
  ...planRow(),
  earlyWithdrawalPenaltyBps: 0,
  schedule: [0, 1, 2, 3].map((i) => ({
    seq: i + 1,
    dueOn: addDays(today, 7 * i),
    status: i === 0 ? "paid" : "scheduled",
  })),
  history: [
    {
      type: "savings_debit",
      direction: "in",
      amount: naira("500000"),
      createdAt: "2026-10-04T08:00:00.000Z",
    },
  ],
  ...over,
});

type Reply = { status: number; body: unknown };
type Routes = Record<string, (init?: RequestInit) => Reply | Promise<Reply>>;
/** Answers each "METHOD /path" from `routes`. The person is signed in, onboarded and has ₦45,000 in the wallet. */
function api(routes: Routes, state: Rails = rails()) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, "http://app").pathname;
    const route = `${init?.method ?? "GET"} ${path}`;
    if (path === "/api/me") return Response.json(me);
    if (path === "/api/wallet/rails") return Response.json(state);
    if (route === "GET /api/wallet")
      return Response.json({
        wallets: [
          { currency: "NGN", available: naira("4500000"), locked: naira("0"), savings: naira("0") },
        ],
      });
    const handler = routes[route];
    if (!handler && route === "GET /api/payments/mandate") return Response.json({});
    if (!handler) return new Response(null, { status: 404 });
    const reply = await handler(init);
    return Response.json(reply.body, { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
/** Text that Amount splits into pieces: match the whole paragraph's words. */
const paragraph = (words: RegExp) => (_: string, element: Element | null) =>
  element?.tagName === "P" && words.test(element.textContent ?? "");

const sends = (mock: ReturnType<typeof api>, route: string) =>
  mock.mock.calls.filter(
    ([url, init]) =>
      `${init?.method ?? "GET"} ${new URL(url as string, "http://app").pathname}` === route,
  );
const body = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);
const headers = (call: unknown[]) => (call[1] as RequestInit).headers as Record<string, string>;

const open = (screen: React.ReactNode) =>
  render(
    <MoneyFlow>
      <SavingsProvider>{screen}</SavingsProvider>
    </MoneyFlow>,
  );

beforeEach(() => {
  query = new URLSearchParams();
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("the savings home", () => {
  it("invites a first plan when there are none", async () => {
    api({ "GET /api/savings": () => ({ status: 200, body: { plans: [] } }) });
    open(<SavingsHome />);
    expect(await screen.findByText("Your first pot is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a plan" })).toHaveAttribute("href", "/save/new");
  });

  it("shows what is in the pots, and each plan with its next debit, separating the finished", async () => {
    api({
      "GET /api/savings": () => ({
        status: 200,
        body: {
          plans: [
            planRow(),
            planRow({
              id: "p2",
              name: "Phone",
              status: "paused",
              saved: naira("100000"),
              target: naira("400000"),
            }),
            planRow({
              id: "p3",
              name: "Trip",
              status: "completed",
              saved: naira("0"),
              nextDebit: null,
            }),
          ],
        },
      }),
    });
    open(<SavingsHome />);
    const total = await screen.findByRole("region", { name: "Saved so far" });
    expect(within(total).getByText("₦6,000")).toBeInTheDocument();
    expect(within(total).getByText("across 2 plans")).toBeInTheDocument();
    const going = screen.getByRole("heading", { name: "Going now" }).closest("section")!;
    expect(within(going).getAllByRole("listitem")).toHaveLength(2);
    expect(within(going).getByRole("link", { name: /Rent/ })).toHaveAttribute("href", "/save/p1");
    expect(within(going).getByText("Paused")).toBeInTheDocument();
    const finished = screen.getByRole("heading", { name: "Finished" }).closest("section")!;
    expect(within(finished).getByText("Complete")).toBeInTheDocument();
    expect(within(finished).getByText("Paid out to your wallet")).toBeInTheDocument();
  });

  it("is locked until the passport is approved, with a way to preview", async () => {
    api({}, rails({ kycApproved: false }));
    open(<SavingsHome />);
    expect(await screen.findByText("Finish your passport first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview the flow" })).toHaveAttribute(
      "href",
      "/save?preview=1",
    );
  });

  it("says so when it cannot load, and tries again when asked", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({
      "GET /api/savings": () =>
        ++calls === 1
          ? { status: 502, body: { message: "down" } }
          : { status: 200, body: { plans: [] } },
    });
    open(<SavingsHome />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your plans/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Your first pot is empty")).toBeInTheDocument();
  });

  it("sends a signed-out person to sign in", async () => {
    api({ "GET /api/savings": () => ({ status: 401, body: { message: "Please sign in." } }) });
    open(<SavingsHome />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("walks a pretend one in a preview, and never calls the savings routes", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api(
      {},
      rails({ kycApproved: false, connected: { fund: false, mandate: false, withdraw: false } }),
    );
    open(<SavingsHome />);
    expect(await screen.findByText(/Preview: nothing here is saved or sent/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Rent/ })).toBeInTheDocument();
    expect(sends(mock, "GET /api/savings")).toHaveLength(0);
  });
});

describe("starting a plan", () => {
  async function toRhythm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByRole("textbox", { name: "Name your plan" }), "School fees");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const pad = await screen.findByRole("group", { name: /number pad/ });
    for (const d of "5000") await user.click(within(pad).getByRole("button", { name: d }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
  const reviewReply = () => ({
    status: 200,
    body: {
      dates: [today, addDays(today, 7), addDays(today, 14)],
      total: naira("1500000"),
      endDate: addDays(today, 14),
    },
  });

  it("asks the server for the days, shows them as beads, and starts the plan with a safety key", async () => {
    const mock = api({
      "POST /api/savings/preview": reviewReply,
      "POST /api/savings": () => ({ status: 201, body: detail({ id: "new1" }) }),
    });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Fewer times" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const receipt = await screen.findByRole("region", { name: "Your plan" });
    expect(within(receipt).getByText("School fees")).toBeInTheDocument();
    expect(within(receipt).getByText("₦15,000")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Your debit days" })).getAllByRole("listitem"),
    ).toHaveLength(3);
    expect(body(sends(mock, "POST /api/savings/preview")[0]!)).toMatchObject({
      name: "School fees",
      amount: "500000",
      frequency: "weekly",
      totalDebits: 11,
      startDate: today,
    });

    await user.click(screen.getByRole("button", { name: "Start my plan" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/save/new1?new=1"));
    const [call] = sends(mock, "POST /api/savings");
    expect(body(call!)).toMatchObject({
      name: "School fees",
      amount: "500000",
      totalDebits: 11,
      topupFromBank: false,
    });
    expect(headers(call!)["Idempotency-Key"]).toMatch(/^ajo_/);
  });

  it("makes the same plan with the same key when the connection drops and it is tried again", async () => {
    let n = 0;
    const mock = api({
      "POST /api/savings/preview": reviewReply,
      "POST /api/savings": () =>
        ++n === 1
          ? { status: 502, body: { message: "We couldn't reach Àjọ." } }
          : { status: 201, body: detail({ id: "new2" }) },
    });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Start my plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t reach/);
    await user.click(screen.getByRole("button", { name: "Start my plan" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/save/new2?new=1"));
    const keys = sends(mock, "POST /api/savings").map((c) => headers(c)["Idempotency-Key"]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("says why when the server refuses the plan, and stays on the rhythm step", async () => {
    api({
      "POST /api/savings/preview": () => ({
        status: 400,
        body: {
          message: "That's below the smallest amount a plan can save at a time.",
          code: "plan_invalid",
        },
      }),
    });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/smallest amount/);
    expect(
      screen.getByRole("heading", { name: "How often, and how many times?" }),
    ).toBeInTheDocument();
  });

  it("points to the passport when identity checks are missing", async () => {
    api({
      "POST /api/savings/preview": reviewReply,
      "POST /api/savings": () => ({
        status: 403,
        body: { message: "Finish verification first.", code: "kyc_required" },
      }),
    });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Start my plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finish verification first.");
    expect(screen.getByRole("link", { name: "Go to my passport" })).toHaveAttribute(
      "href",
      "/verify",
    );
  });

  it("offers to top up from the bank only when auto-debit is on, and sends the choice", async () => {
    const mock = api({
      "POST /api/savings/preview": reviewReply,
      "POST /api/savings": () => ({ status: 201, body: detail({ id: "new3" }) }),
      "GET /api/payments/mandate": () => ({ status: 200, body: { id: "m1", status: "active" } }),
    });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("checkbox", { name: /Top up from my bank/ }));
    await user.click(screen.getByRole("button", { name: "Start my plan" }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(body(sends(mock, "POST /api/savings")[0]!).topupFromBank).toBe(true);
  });

  it("points to auto-debit set-up instead when there is none", async () => {
    api({ "POST /api/savings/preview": reviewReply });
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("link", { name: "Set up auto-debit" })).toHaveAttribute(
      "href",
      "/wallet/mandate",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("will not go on without a name or an amount, and goes back a step at a time", async () => {
    api({});
    const user = userEvent.setup();
    open(<NewPlan />);
    expect(await screen.findByRole("button", { name: "Continue" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Rent" }));
    expect(screen.getByRole("textbox", { name: "Name your plan" })).toHaveValue("Rent");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "What are you saving for?" })).toBeInTheDocument();
  });

  it("keeps the number of times within what the frequency allows", async () => {
    api({});
    const user = userEvent.setup();
    open(<NewPlan />);
    await user.click(await screen.findByRole("radio", { name: "Rent" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const pad = await screen.findByRole("group", { name: /number pad/ });
    await user.click(within(pad).getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Daily" }));
    await user.click(screen.getByRole("radio", { name: "90" }));
    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByText("60", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More times" })).toBeDisabled();
  });

  it("walks the whole thing in a preview, and lands on the new pot", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({}, rails({ kycApproved: false }));
    const user = userEvent.setup();
    open(<NewPlan />);
    await toRhythm(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Preview")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start my plan" }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringMatching(/^\/save\/preview-\d+\?preview=1&new=1$/),
      ),
    );
    expect(sends(mock, "POST /api/savings")).toHaveLength(0);
  });
});

describe("one plan", () => {
  it("shows the pot, what is next, whether the wallet covers it, the beads and the history", async () => {
    api({ "GET /api/savings/p1": () => ({ status: 200, body: detail() }) });
    open(<PlanScreen id="p1" />);
    const pot = await screen.findByRole("region", { name: "Your pot" });
    expect(within(pot).getByText("₦5,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
    expect(within(pot).getByText(/1 of 4 debits/)).toBeInTheDocument();
    const next = screen.getByRole("region", { name: "Next debit" });
    expect(
      await within(next).findByText(/Your wallet has ₦45,000, enough for it/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Debit days" })).getAllByRole("listitem"),
    ).toHaveLength(4);
    expect(
      within(screen.getByRole("region", { name: "History" })).getByText("Debit from your wallet"),
    ).toBeInTheDocument();
  });

  it("warns, with a way to fix it, when the wallet will not cover the next debit", async () => {
    api({
      "GET /api/savings/p1": () => ({
        status: 200,
        body: detail({
          amount: naira("9000000"),
          nextDebit: { dueOn: addDays(today, 7), amount: naira("9000000") },
        }),
      }),
    });
    open(<PlanScreen id="p1" />);
    const next = await screen.findByRole("region", { name: "Next debit" });
    expect(await within(next).findByText(/not enough yet/)).toBeInTheDocument();
    expect(within(next).getByRole("link", { name: "Add money" })).toHaveAttribute(
      "href",
      "/wallet/add",
    );
  });

  it("says plainly when debits were missed", async () => {
    api({ "GET /api/savings/p1": () => ({ status: 200, body: detail({ failedDebits: 2 }) }) });
    open(<PlanScreen id="p1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/2 debits were missed/);
  });

  it("welcomes a new plan, once", async () => {
    query = new URLSearchParams("new=1");
    api({ "GET /api/savings/p1": () => ({ status: 200, body: detail() }) });
    open(<PlanScreen id="p1" />);
    expect(await screen.findByText(/Your pot is ready/)).toBeInTheDocument();
  });

  it("tops up from the wallet with a key, and the pot grows", async () => {
    const mock = api({
      "GET /api/savings/p1": () => ({ status: 200, body: detail() }),
      "POST /api/savings/p1/topup": () => ({
        status: 200,
        body: detail({ saved: naira("800000") }),
      }),
    });
    const user = userEvent.setup();
    open(<PlanScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: /Add to this pot now/ }));
    const pad = await screen.findByRole("group", { name: /number pad/ });
    for (const d of "3000") await user.click(within(pad).getByRole("button", { name: d }));
    await user.click(screen.getByRole("button", { name: "Add it" }));
    expect(await screen.findByText("₦8,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
    const [call] = sends(mock, "POST /api/savings/p1/topup");
    expect(body(call!)).toEqual({ amount: "300000" });
    expect(headers(call!)["Idempotency-Key"]).toMatch(/^ajo_/);
  });

  it("shows the API's reason when a top-up is refused, and leaves the panel open", async () => {
    api({
      "GET /api/savings/p1": () => ({ status: 200, body: detail() }),
      "POST /api/savings/p1/topup": () => ({
        status: 409,
        body: {
          message: "You don't have enough in your wallet for that.",
          code: "insufficient_funds",
        },
      }),
    });
    const user = userEvent.setup();
    open(<PlanScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: /Add to this pot now/ }));
    const pad = await screen.findByRole("group", { name: /number pad/ });
    await user.click(within(pad).getByRole("button", { name: "9" }));
    await user.click(screen.getByRole("button", { name: "Add it" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/enough in your wallet/);
    expect(screen.getByRole("button", { name: "Add it" })).toBeInTheDocument();
  });

  it("pauses, then offers to start again", async () => {
    const mock = api({
      "GET /api/savings/p1": () => ({ status: 200, body: detail() }),
      "POST /api/savings/p1/pause": () => ({ status: 200, body: detail({ status: "paused" }) }),
    });
    const user = userEvent.setup();
    open(<PlanScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: "Pause the plan" }));
    expect(await screen.findByRole("button", { name: "Start it again" })).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(sends(mock, "POST /api/savings/p1/pause")).toHaveLength(1);
  });

  it("ends early only after the PIN, says what comes back, and shows the result", async () => {
    const mock = api({
      "GET /api/savings/p1": () => ({
        status: 200,
        body: detail({ earlyWithdrawalPenaltyBps: 500 }),
      }),
      "POST /api/savings/p1/withdraw": () => ({
        status: 200,
        body: detail({
          status: "cancelled",
          saved: naira("0"),
          payout: naira("475000"),
          penalty: naira("25000"),
          nextDebit: null,
        }),
      }),
    });
    const user = userEvent.setup();
    open(<PlanScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: "End the plan early" }));
    expect(
      screen.getByText(paragraph(/₦4,750 goes back to your wallet now, after a ₦250 charge/)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(paragraph(/3 debits still to come will be cancelled/)),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End it" })).toBeDisabled();
    const pin = screen.getByRole("group", { name: "Your PIN, to be sure" });
    for (const d of "493817") await user.click(within(pin).getByRole("button", { name: d }));
    await user.click(screen.getByRole("button", { name: "End it" }));
    expect(await screen.findByText(paragraph(/You ended this plan early/))).toBeInTheDocument();
    expect(body(sends(mock, "POST /api/savings/p1/withdraw")[0]!)).toEqual({ pin: "493817" });
    expect(screen.queryByRole("button", { name: "End the plan early" })).not.toBeInTheDocument();
  });

  it("keeps the plan and says so when the PIN is wrong", async () => {
    api({
      "GET /api/savings/p1": () => ({ status: 200, body: detail() }),
      "POST /api/savings/p1/withdraw": () => ({
        status: 422,
        body: { message: "That PIN isn't right." },
      }),
    });
    const user = userEvent.setup();
    open(<PlanScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: "End the plan early" }));
    const pin = screen.getByRole("group", { name: "Your PIN, to be sure" });
    for (const d of "000000") await user.click(within(pin).getByRole("button", { name: d }));
    await user.click(screen.getByRole("button", { name: "End it" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That PIN isn't right.");
    await user.click(screen.getByRole("button", { name: "Keep the plan" }));
    expect(screen.getByRole("button", { name: "End the plan early" })).toBeInTheDocument();
  });

  it("shows a finished plan's payout and offers no actions", async () => {
    api({
      "GET /api/savings/p1": () => ({
        status: 200,
        body: detail({
          status: "completed",
          saved: naira("0"),
          payout: naira("2000000"),
          nextDebit: null,
        }),
      }),
    });
    open(<PlanScreen id="p1" />);
    expect(await screen.findByText(paragraph(/₦20,000 is in your wallet/))).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "What you can do" })).not.toBeInTheDocument();
  });

  it("says when there is no such plan, or it could not load, and signs out the signed out", async () => {
    api({ "GET /api/savings/p1": () => ({ status: 404, body: { message: "Not found" } }) });
    const { unmount } = open(<PlanScreen id="p1" />);
    expect(await screen.findByText("We couldn't find that plan.")).toBeInTheDocument();
    unmount();
    api({ "GET /api/savings/p1": () => ({ status: 502, body: { message: "down" } }) });
    const second = open(<PlanScreen id="p1" />);
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    second.unmount();
    api({ "GET /api/savings/p1": () => ({ status: 401, body: { message: "Please sign in." } }) });
    open(<PlanScreen id="p1" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("lets a preview take the next debit and watch the pot fill, without touching the server", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({}, rails({ kycApproved: false }));
    const user = userEvent.setup();
    open(
      <>
        <SavingsHome />
      </>,
    );
    const card = await screen.findByRole("link", { name: /Rent/ });
    const href = card.getAttribute("href")!;
    const id = href.split("?")[0]!.split("/").at(-1)!;
    expect(id).toMatch(/^preview-/);
    // Open the same pretend plan on its own screen, in the same provider.
    const { unmount } = open(<PlanScreen id={id} />);
    void unmount;
    await user.click(
      (await screen.findAllByRole("button", { name: "Preview: take the next debit" }))[0]!,
    );
    expect(sends(mock, `POST /api/savings/${id}/pause`)).toHaveLength(0);
    expect(screen.getAllByText(/6 of 12 debits/).length).toBeGreaterThan(0);
  });
});
