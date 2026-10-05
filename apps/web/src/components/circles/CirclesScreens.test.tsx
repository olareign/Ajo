import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";
import { CircleScreen } from "./CircleScreen";
import { CirclesProvider } from "./CirclesFlow";
import { CirclesHome } from "./CirclesHome";
import { DiscoverCircles } from "./DiscoverCircles";
import { JoinCircle } from "./JoinCircle";
import { NewCircle } from "./NewCircle";
import { TodayCircles } from "./TodayCircles";

const replace = vi.fn();
const push = vi.fn();
const router = { replace, push };
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

type Reply = { status: number; body?: unknown };
type Routes = Record<string, (init?: RequestInit, url?: string) => Reply | Promise<Reply>>;
function api(routes: Routes, state: Rails = rails()) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url, "http://app");
    if (u.pathname === "/api/me") return Response.json(me);
    if (u.pathname === "/api/wallet/rails") return Response.json(state);
    const handler = routes[`${init?.method ?? "GET"} ${u.pathname}`];
    if (!handler) return new Response(null, { status: 404 });
    const reply = await handler(init, url);
    return Response.json(reply.body ?? {}, { status: reply.status });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
const sent = (mock: ReturnType<typeof api>, route: string) =>
  mock.mock.calls.filter(
    ([url, init]) =>
      `${init?.method ?? "GET"} ${new URL(url as string, "http://app").pathname}` === route,
  );
const json = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

const open = (node: React.ReactNode) =>
  render(
    <MoneyFlow>
      <CirclesProvider>{node}</CirclesProvider>
    </MoneyFlow>,
  );

const money = (amount: string) => ({ amount, currency: "NGN" });
const rules = {
  deposit: money("1000000"),
  earlyDeposit: money("3000000"),
  earlySpots: 2,
  feeBps: 0,
  lateFeeBps: 0,
  graceDays: 2,
};
const summary = (over: object = {}) => ({
  id: "g1",
  name: "Sunday circle",
  community: null,
  status: "open",
  currency: "NGN",
  contribution: "1000000",
  frequency: "monthly",
  size: 4,
  memberCount: 2,
  startDate: "2030-02-01",
  orderMethod: "random",
  visibility: "public",
  pot: "4000000",
  creator: { username: "chidi_o", displayName: "Chidi Okafor" },
  isMember: false,
  isCreator: false,
  mySpot: null,
  friendsIn: 0,
  inviteCode: null,
  rules,
  ...over,
});
const trust = { level: "trusted", score: 60 };
const member = (username: string, over: object = {}) => ({
  username,
  displayName: username.replace(/_/g, " ").toUpperCase(),
  spot: null,
  isYou: false,
  isCreator: false,
  trust,
  current: null,
  ...over,
});
const detail = (over: object = {}) => ({
  ...summary({ isMember: true, inviteCode: "ABCD1234" }),
  members: [member("you", { isYou: true, isCreator: true }), member("chidi_o")],
  rounds: [],
  draws: [],
  myDeposit: money("1000000"),
  pickDeadline: null,
  nextDue: null,
  graceDays: 2,
  ...over,
});

beforeEach(() => {
  query = new URLSearchParams();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  replace.mockReset();
  push.mockReset();
});

describe("the circles home", () => {
  it("says there are no circles yet, and offers to start or find one", async () => {
    api({ "GET /api/groups": () => ({ status: 200, body: { groups: [] } }) });
    open(<CirclesHome />);
    expect(await screen.findByRole("region", { name: "No circles yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start a circle/ })).toHaveAttribute(
      "href",
      "/circles/new",
    );
    expect(screen.getByRole("link", { name: /Find a circle to join/ })).toHaveAttribute(
      "href",
      "/circles/discover",
    );
  });

  it("lists circles you are in, with how full they are, and the finished ones apart", async () => {
    api({
      "GET /api/groups": () => ({
        status: 200,
        body: {
          groups: [
            summary({ id: "a", name: "Filling", isMember: true }),
            summary({ id: "b", name: "Under way", status: "running", memberCount: 4, mySpot: 3 }),
            summary({ id: "c", name: "All done", status: "completed", memberCount: 4 }),
          ],
        },
      }),
    });
    open(<CirclesHome />);
    const going = await screen
      .findByRole("list", { name: "" }, { timeout: 3000 })
      .catch(() => null);
    expect(going).toBeNull();
    expect(await screen.findByRole("heading", { name: "Your circles" })).toBeInTheDocument();
    expect(screen.getByText(/2 of 4 joined/)).toBeInTheDocument();
    expect(screen.getByText(/your turn is 3 of 4/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finished" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Under way/ })).toHaveAttribute("href", "/circles/b");
  });

  it("is locked until the passport is approved, says when it cannot load, and signs out the signed out", async () => {
    api({}, rails({ kycApproved: false }));
    const first = open(<CirclesHome />);
    expect(await screen.findByText("Finish your passport first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview the flow" })).toHaveAttribute(
      "href",
      "/circles?preview=1",
    );
    first.unmount();

    api({ "GET /api/groups": () => ({ status: 502, body: {} }) });
    const second = open(<CirclesHome />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your circles/);
    second.unmount();

    api({ "GET /api/groups": () => ({ status: 401, body: { message: "Please sign in." } }) });
    open(<CirclesHome />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("walks pretend circles in a preview and never calls the circles routes", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({}, rails({ kycApproved: false }));
    open(<CirclesHome />);
    expect(await screen.findByText(/Preview: nothing here is saved or sent/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Sunday circle/ })).toBeInTheDocument();
    expect(sent(mock, "GET /api/groups")).toHaveLength(0);
  });
});

describe("finding a circle", () => {
  it("shows open circles with a note when friends are in them", async () => {
    api({
      "GET /api/groups/discover": () => ({
        status: 200,
        body: {
          groups: [
            { ...summary({ id: "x", name: "Market circle", friendsIn: 2 }), score: 20 },
            { ...summary({ id: "y", name: "Office circle", friendsIn: 1 }), score: 10 },
            { ...summary({ id: "z", name: "Strangers" }), score: 0 },
          ],
        },
      }),
    });
    open(<DiscoverCircles />);
    const list = await screen.findByRole("list", { name: "Open circles" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("2 friends are in this circle")).toBeInTheDocument();
    expect(within(list).getByText("1 friend is in this circle")).toBeInTheDocument();
  });

  it("says so when none are open, and can try again after a failure", async () => {
    let n = 0;
    api({
      "GET /api/groups/discover": () =>
        ++n === 1 ? { status: 502, body: {} } : { status: 200, body: { groups: [] } },
    });
    const user = userEvent.setup();
    open(<DiscoverCircles />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load circles/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No open circles right now/)).toBeInTheDocument();
  });
});

describe("an invite to a circle", () => {
  it("shows what joining means and joins with one button, going on to the circle", async () => {
    const mock = api({
      "GET /api/groups/code/ABCD1234": () => ({ status: 200, body: summary() }),
      "POST /api/groups/join": () => ({ status: 200, body: detail({ id: "g9" }) }),
    });
    const user = userEvent.setup();
    open(<JoinCircle code="ABCD1234" />);
    expect(await screen.findByRole("heading", { name: "Join Sunday circle" })).toBeInTheDocument();
    expect(screen.getByText(/Chidi Okafor invited you/)).toBeInTheDocument();
    expect(screen.getByText(/Trusted members lock nothing/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join this circle" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/circles/g9"));
    expect(json(sent(mock, "POST /api/groups/join")[0]!)).toEqual({ code: "ABCD1234" });
  });

  it("links to adding money when the deposit is short, and to auto-debit when it is not set up", async () => {
    let code = "deposit_needed";
    api({
      "GET /api/groups/code/ABCD1234": () => ({ status: 200, body: summary() }),
      "POST /api/groups/join": () => ({
        status: 409,
        body: { message: "That needs a deposit.", code },
      }),
    });
    const user = userEvent.setup();
    open(<JoinCircle code="ABCD1234" />);
    await user.click(await screen.findByRole("button", { name: "Join this circle" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That needs a deposit.");
    expect(screen.getByRole("link", { name: "Add money" })).toHaveAttribute("href", "/wallet/add");
    code = "no_mandate";
    await user.click(screen.getByRole("button", { name: "Join this circle" }));
    expect(await screen.findByRole("link", { name: "Set up auto-debit" })).toHaveAttribute(
      "href",
      "/wallet/mandate",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("does not offer joining a full circle, sends members to it, and says an unknown invite is invalid", async () => {
    api({
      "GET /api/groups/code/FULL0000": () => ({ status: 200, body: summary({ memberCount: 4 }) }),
      "GET /api/groups/code/MINE0000": () => ({
        status: 200,
        body: summary({ id: "mine", isMember: true }),
      }),
      "GET /api/groups/code/NONE0000": () => ({
        status: 404,
        body: { message: "no", code: "invite_not_found" },
      }),
    });
    const first = open(<JoinCircle code="FULL0000" />);
    expect(await screen.findByText("This circle is full.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join this circle" })).toBeNull();
    first.unmount();

    const second = open(<JoinCircle code="MINE0000" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/circles/mine"));
    second.unmount();

    open(<JoinCircle code="NONE0000" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn.t valid/);
  });
});

describe("making a circle", () => {
  async function fillIn(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText("Circle name"), "Sunday circle");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const pad = await screen.findByRole("group", { name: /number pad/ });
    await user.click(within(pad).getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }

  it("takes a name, an amount, the rules, then shows the whole cycle before saving, and saves once", async () => {
    const mock = api({
      "POST /api/groups/preview": () => ({
        status: 200,
        body: {
          dates: [
            "2030-02-01",
            "2030-03-01",
            "2030-04-01",
            "2030-05-01",
            "2030-06-01",
            "2030-07-01",
          ],
          pot: money("3000"),
          fee: money("0"),
          deposit: money("500"),
          earlyDeposit: money("1500"),
          earlySpots: 2,
          graceDays: 2,
        },
      }),
      "POST /api/groups": () => ({ status: 201, body: detail({ id: "new1" }) }),
    });
    const user = userEvent.setup();
    open(<NewCircle />);
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Look it over" })).toBeInTheDocument();
    expect(sent(mock, "POST /api/groups")).toHaveLength(0);
    expect(screen.getByText("Sunday circle")).toBeInTheDocument();
    const previewBody = json(sent(mock, "POST /api/groups/preview")[0]!);
    expect(previewBody).toMatchObject({
      name: "Sunday circle",
      contribution: "500",
      size: 6,
      frequency: "monthly",
      orderMethod: "random",
      visibility: "private",
    });
    await user.click(screen.getByRole("button", { name: "Start my circle" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/circles/new1?new=1"));
    expect(sent(mock, "POST /api/groups")).toHaveLength(1);
    const call = sent(mock, "POST /api/groups")[0]!;
    expect((call[1] as RequestInit).headers).toMatchObject({
      "Idempotency-Key": expect.any(String),
    });
  });

  it("keeps the same attempt key when the same circle is sent again after a failure", async () => {
    let n = 0;
    const mock = api({
      "POST /api/groups/preview": () => ({
        status: 200,
        body: {
          dates: ["2030-02-01"],
          pot: money("3000"),
          fee: money("0"),
          deposit: money("500"),
          earlyDeposit: money("1500"),
          earlySpots: 2,
          graceDays: 2,
        },
      }),
      "POST /api/groups": () =>
        ++n === 1 ? { status: 502, body: {} } : { status: 201, body: detail({ id: "new2" }) },
    });
    const user = userEvent.setup();
    open(<NewCircle />);
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const start = await screen.findByRole("button", { name: "Start my circle" });
    await user.click(start);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start my circle" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/circles/new2?new=1"));
    const keys = sent(mock, "POST /api/groups").map(
      (c) => ((c[1] as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("will not go past the first step without a name, or the second without an amount", async () => {
    api({});
    const user = userEvent.setup();
    open(<NewCircle />);
    await screen.findByLabelText("Circle name");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(screen.getByLabelText("Circle name"), "X");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows the reason when the server refuses the plan", async () => {
    api({
      "POST /api/groups/preview": () => ({
        status: 422,
        body: { message: "That amount is above what you can take on.", code: "limit" },
      }),
    });
    const user = userEvent.setup();
    open(<NewCircle />);
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/above what you can take on/);
  });

  it("makes a pretend circle in a preview without calling the server", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({});
    const user = userEvent.setup();
    open(<NewCircle />);
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Start my circle" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(push.mock.calls[0]![0]).toMatch(/^\/circles\/preview-g\d+\?preview=1&new=1$/);
    expect(sent(mock, "POST /api/groups")).toHaveLength(0);
  });
});

describe("a circle", () => {
  it("shows the invite to share while it fills, and sends an invite to a friend", async () => {
    const mock = api({
      "GET /api/groups/g1": () => ({ status: 200, body: detail() }),
      "POST /api/groups/g1/invite": () => ({ status: 200, body: {} }),
    });
    const user = userEvent.setup();
    query = new URLSearchParams("new=1");
    open(<CircleScreen id="g1" />);
    expect(await screen.findByText("ABCD1234")).toBeInTheDocument();
    expect(screen.getByText(/Your circle is open/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    await user.type(screen.getByLabelText("Invite a friend"), "funmi_a");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText("Invite sent to @funmi_a.")).toBeInTheDocument();
    expect(json(sent(mock, "POST /api/groups/g1/invite")[0]!)).toEqual({ username: "funmi_a" });
  });

  it("asks before calling off a circle you made, then does it and shows it called off", async () => {
    let cancelled = false;
    const mock = api({
      "GET /api/groups/g1": () => ({
        status: 200,
        body: detail({ isCreator: true, status: cancelled ? "cancelled" : "open" }),
      }),
      "POST /api/groups/g1/cancel": () => {
        cancelled = true;
        return { status: 200, body: detail({ isCreator: true, status: "cancelled" }) };
      },
    });
    const user = userEvent.setup();
    open(<CircleScreen id="g1" />);
    await user.click(await screen.findByRole("button", { name: "Call off the circle" }));
    expect(sent(mock, "POST /api/groups/g1/cancel")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Call it off" }));
    expect(await screen.findByText(/This circle was called off/)).toBeInTheDocument();
    expect(sent(mock, "POST /api/groups/g1/cancel")).toHaveLength(1);
  });

  it("lets a member who is not the creator leave, and offers nothing to a stranger but joining", async () => {
    api({
      "GET /api/groups/m1": () => ({
        status: 200,
        body: detail({ id: "m1", isCreator: false }),
      }),
      "GET /api/groups/s1": () => ({
        status: 200,
        body: {
          ...summary({ id: "s1" }),
          members: [],
          rounds: [],
          draws: [],
          myDeposit: null,
          pickDeadline: null,
          nextDue: null,
          graceDays: 2,
        },
      }),
      "POST /api/groups/s1/join": () => ({ status: 200, body: detail({ id: "s1" }) }),
    });
    const first = open(<CircleScreen id="m1" />);
    expect(await screen.findByRole("button", { name: "Leave the circle" })).toBeInTheDocument();
    first.unmount();

    const user = userEvent.setup();
    open(<CircleScreen id="s1" />);
    await user.click(await screen.findByRole("button", { name: "Join this circle" }));
    expect(await screen.findByRole("button", { name: "Leave the circle" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join this circle" })).toBeNull();
  });

  it("lets everyone pick a turn once the circle is full, and shows the turn taken", async () => {
    const mock = api({
      "GET /api/groups/p1": () => ({
        status: 200,
        body: detail({
          id: "p1",
          status: "picking",
          memberCount: 4,
          mySpot: null,
          pickDeadline: "2030-01-02T10:00:00Z",
          members: [
            member("you", { isYou: true }),
            member("chidi_o", { spot: 2 }),
            member("funmi_a"),
            member("tunde_b"),
          ],
        }),
      }),
      "POST /api/groups/p1/pick": () => ({
        status: 200,
        body: detail({
          id: "p1",
          status: "picking",
          memberCount: 4,
          mySpot: 3,
          members: [
            member("you", { isYou: true, spot: 3 }),
            member("chidi_o", { spot: 2 }),
            member("funmi_a"),
            member("tunde_b"),
          ],
        }),
      }),
    });
    const user = userEvent.setup();
    open(<CircleScreen id="p1" />);
    expect(await screen.findByRole("heading", { name: "Pick your turn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn 2, taken by CHIDI O" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pick turn 1 (early)" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Pick turn 3" }));
    expect(await screen.findByRole("heading", { name: "You picked turn 3" })).toBeInTheDocument();
    expect(json(sent(mock, "POST /api/groups/p1/pick")[0]!)).toEqual({ spot: 3 });
    expect(screen.getByRole("button", { name: "Turn 3, taken by you" })).toBeDisabled();
  });

  it("says when someone else took the turn first", async () => {
    api({
      "GET /api/groups/p1": () => ({
        status: 200,
        body: detail({
          id: "p1",
          status: "picking",
          memberCount: 4,
          members: [member("you", { isYou: true }), member("chidi_o")],
        }),
      }),
      "POST /api/groups/p1/pick": () => ({
        status: 409,
        body: { message: "Someone just took that turn.", code: "spot_taken" },
      }),
    });
    const user = userEvent.setup();
    open(<CircleScreen id="p1" />);
    await user.click(await screen.findByRole("button", { name: "Pick turn 1 (early)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Someone just took that turn.");
  });

  const running = (over: object = {}) =>
    detail({
      id: "r1",
      status: "running",
      memberCount: 3,
      size: 3,
      mySpot: 2,
      isCreator: false,
      pot: "3000000",
      members: [
        member("you", { isYou: true, spot: 2, current: "scheduled" }),
        member("chidi_o", { spot: 1, current: "paid" }),
        member("funmi_a", { spot: 3, current: "late" }),
      ],
      rounds: [1, 2, 3].map((n) => ({
        roundNo: n,
        dueOn: `2030-0${n + 1}-01`,
        recipient: ["chidi_o", "you", "funmi_a"][n - 1],
        recipientName: ["CHIDI O", "Ada Ola", "FUNMI A"][n - 1],
        isYours: n === 2,
        status: n === 1 ? "paid_out" : "scheduled",
        payout: n === 1 ? money("3000000") : null,
        fee: n === 1 ? money("0") : null,
        paid: n === 1 ? 3 : 0,
        yours: n === 1 ? "paid" : "scheduled",
        board: [],
      })),
      draws: [
        {
          kind: "random",
          seed: "a".repeat(64),
          createdAt: "2030-01-01T00:00:00Z",
          order: [
            { spot: 1, username: "chidi_o", displayName: "CHIDI O" },
            { spot: 2, username: "you", displayName: "Ada Ola" },
            { spot: 3, username: "funmi_a", displayName: "FUNMI A" },
          ],
        },
      ],
      nextDue: { roundNo: 2, dueOn: "2030-03-01" },
      ...over,
    });

  it("shows whose turn it is, when yours is, who has paid, and the draw anyone can check", async () => {
    api({
      "GET /api/groups/r1": () => ({ status: 200, body: running() }),
      "GET /api/groups/r1/swaps": () => ({ status: 200, body: [] }),
    });
    open(<CircleScreen id="r1" />);
    const turn = await screen.findByRole("region", { name: "Your turn" });
    expect(turn).toHaveTextContent("Turn 2 of 3");
    expect(
      await screen.findByRole("heading", { name: "Round 2: who has paid" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Every round" })).toHaveTextContent("Round 1");
    expect(screen.queryByRole("region", { name: "Members" })).toBeNull();
    expect(screen.getByText("How the turns were drawn")).toBeInTheDocument();
    expect(screen.getByText(/a{8}/, { exact: false })).toBeInTheDocument();
  });

  it("lets you answer a swap someone asked for, and says the swap went through", async () => {
    const mock = api({
      "GET /api/groups/r1": () => ({ status: 200, body: running() }),
      "GET /api/groups/r1/swaps": () => ({
        status: 200,
        body: [
          {
            id: "s9",
            fromUsername: "funmi_a",
            fromName: "FUNMI A",
            toUsername: "you",
            toName: "Ada Ola",
            incoming: true,
          },
        ],
      }),
      "POST /api/groups/r1/swaps/s9": () => ({ status: 200, body: running() }),
    });
    const user = userEvent.setup();
    open(<CircleScreen id="r1" />);
    const section = await screen.findByRole("region", { name: "Swap requests" });
    expect(section).toHaveTextContent("FUNMI A would like to swap turns with you.");
    await user.click(within(section).getByRole("button", { name: "Yes, swap" }));
    await waitFor(() =>
      expect(json(sent(mock, "POST /api/groups/r1/swaps/s9")[0]!)).toEqual({ accept: true }),
    );
  });

  it("says when it cannot load, can try again, and says an unknown circle is not found", async () => {
    let n = 0;
    api({
      "GET /api/groups/g1": () =>
        ++n === 1 ? { status: 502, body: {} } : { status: 200, body: detail() },
      "GET /api/groups/none": () => ({ status: 404, body: { message: "no" } }),
    });
    const user = userEvent.setup();
    const first = open(<CircleScreen id="g1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load this circle/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Get it full")).toBeInTheDocument();
    first.unmount();

    open(<CircleScreen id="none" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t find that circle/);
  });

  it("walks the whole life of a pretend circle in a preview", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({});
    const user = userEvent.setup();
    open(<CirclesHome />);
    await user.click(await screen.findByRole("link", { name: /Sunday circle/ }));
    expect(sent(mock, "GET /api/groups")).toHaveLength(0);
  });
});

describe("the circles card on Today", () => {
  it("shows the circle under way and where your turn is", async () => {
    api({
      "GET /api/groups": () => ({
        status: 200,
        body: { groups: [summary({ status: "running", memberCount: 4, mySpot: 3 })] },
      }),
    });
    render(<TodayCircles go />);
    expect(await screen.findByText("Sunday circle")).toBeInTheDocument();
    expect(screen.getByText(/Your turn is 3 of 4/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/circles");
  });

  it("invites you to start one when you have none, and waits for its turn", async () => {
    const mock = api({ "GET /api/groups": () => ({ status: 200, body: { groups: [] } }) });
    const idle = render(<TodayCircles go={false} />);
    expect(sent(mock, "GET /api/groups")).toHaveLength(0);
    idle.unmount();
    render(<TodayCircles go />);
    expect(await screen.findByText("Save together")).toBeInTheDocument();
  });

  it("shows nothing when circles cannot be had", async () => {
    api({
      "GET /api/groups": () => ({ status: 403, body: { message: "no", code: "kyc_required" } }),
    });
    const { container } = render(<TodayCircles go />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
