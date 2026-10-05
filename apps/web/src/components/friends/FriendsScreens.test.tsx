import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { MoneyFlow } from "@/components/wallet/MoneyFlow";
import { BlockedScreen } from "./BlockedScreen";
import { FindPeople, SEARCH_DELAY_MS } from "./FindPeople";
import { FriendsHome } from "./FriendsHome";
import { FriendsProvider } from "./FriendsFlow";
import { InviteScreen } from "./InviteScreen";
import { JoinScreen } from "./JoinScreen";
import { PersonScreen } from "./PersonScreen";
import { RequestsScreen } from "./RequestsScreen";

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
const person = (username: string, over: object = {}) => ({
  username,
  displayName: username.replace(/_/g, " ").toUpperCase(),
  relation: "none",
  mutualFriends: 0,
  tier: 1,
  trust: { level: "new", score: 0 },
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
    return reply.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(reply.body ?? {}, { status: reply.status });
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

const open = (screen: React.ReactNode) =>
  render(
    <MoneyFlow>
      <FriendsProvider>{screen}</FriendsProvider>
    </MoneyFlow>,
  );

beforeEach(() => {
  query = new URLSearchParams();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  replace.mockReset();
  push.mockReset();
});

const friend = (username: string, tier = 1) => ({
  username,
  displayName: username.toUpperCase(),
  since: "2026-09-01T00:00:00Z",
  tier,
  trust: { level: "trusted", score: 50 },
});

describe("the friends home", () => {
  it("draws the circle, shows what is waiting, who you may know, and your friends", async () => {
    api({
      "GET /api/friends": () => ({
        status: 200,
        body: { friends: [friend("chidi_o", 2), friend("funmi_a")] },
      }),
      "GET /api/friends/requests": () => ({
        status: 200,
        body: {
          incoming: [
            { username: "tunde_b", displayName: "Tunde", sentAt: "2026-10-03T00:00:00Z", tier: 1 },
          ],
          outgoing: [],
        },
      }),
      "GET /api/friends/suggestions": () => ({
        status: 200,
        body: [
          {
            ...person("ngozi_e", { mutualFriends: 2 }),
            reason: "mutual",
            mutualNames: ["Chidi", "Funmi"],
          },
        ],
      }),
    });
    open(<FriendsHome />);
    const circle = await screen.findByRole("region", { name: "Your circle" });
    expect(within(circle).getByText("2 friends")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1 request is waiting for you/ })).toHaveAttribute(
      "href",
      "/friends/requests",
    );
    const may = screen.getByRole("heading", { name: "People you may know" }).closest("section")!;
    expect(within(may).getByText("2 in common: Chidi, Funmi")).toBeInTheDocument();
    const mine = screen.getByRole("heading", { name: "Your friends" }).closest("section")!;
    expect(within(mine).getAllByRole("link")).toHaveLength(2);
    expect(within(mine).getByText("Verified +")).toBeInTheDocument();
    expect(within(mine).getAllByText("Trusted")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Find people" })).toHaveAttribute(
      "href",
      "/friends/find",
    );
    expect(screen.getByRole("link", { name: "Invite" })).toHaveAttribute("href", "/friends/invite");
  });

  it("invites someone with no friends to find some", async () => {
    api({
      "GET /api/friends": () => ({ status: 200, body: { friends: [] } }),
      "GET /api/friends/requests": () => ({ status: 200, body: { incoming: [], outgoing: [] } }),
      "GET /api/friends/suggestions": () => ({ status: 200, body: [] }),
    });
    open(<FriendsHome />);
    expect(await screen.findByText(/Your circle is empty/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your friends" })).not.toBeInTheDocument();
  });

  it("asks for one thing after another, never together", async () => {
    const order: string[] = [];
    api({
      "GET /api/friends": () => (order.push("friends"), { status: 200, body: { friends: [] } }),
      "GET /api/friends/requests": () => (
        order.push("requests"),
        { status: 200, body: { incoming: [], outgoing: [] } }
      ),
      "GET /api/friends/suggestions": () => (order.push("suggestions"), { status: 200, body: [] }),
    });
    open(<FriendsHome />);
    await screen.findByText(/Your circle is empty/);
    expect(order).toEqual(["friends", "requests", "suggestions"]);
  });

  it("is locked until the passport is approved, with a preview; says when it cannot load; signs out the signed out", async () => {
    api({}, rails({ kycApproved: false }));
    const first = open(<FriendsHome />);
    expect(await screen.findByText("Finish your passport first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview the flow" })).toHaveAttribute(
      "href",
      "/friends?preview=1",
    );
    first.unmount();

    api({ "GET /api/friends": () => ({ status: 502, body: {} }) });
    const second = open(<FriendsHome />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your friends/);
    second.unmount();

    api({ "GET /api/friends": () => ({ status: 401, body: { message: "Please sign in." } }) });
    open(<FriendsHome />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("walks a pretend circle in a preview and never calls the friends routes", async () => {
    query = new URLSearchParams("preview=1");
    const mock = api({}, rails({ kycApproved: false }));
    open(<FriendsHome />);
    expect(await screen.findByText(/Preview: nothing here is saved or sent/)).toBeInTheDocument();
    expect(await screen.findByText("CHIDI_O", { exact: false })).toBeInTheDocument();
    expect(sent(mock, "GET /api/friends")).toHaveLength(0);
  });

  it("adds someone you may know with one tap, and says why if it fails", async () => {
    let n = 0;
    const mock = api({
      "GET /api/friends": () => ({ status: 200, body: { friends: [] } }),
      "GET /api/friends/requests": () => ({ status: 200, body: { incoming: [], outgoing: [] } }),
      "GET /api/friends/suggestions": () => ({
        status: 200,
        body: [{ ...person("ngozi_e"), reason: "invited_you", mutualNames: [] }],
      }),
      "POST /api/friends/requests": () =>
        ++n === 1
          ? {
              status: 409,
              body: { message: "You have a lot of requests waiting.", code: "too_many_requests" },
            }
          : { status: 200, body: { relation: "requested" } },
    });
    const user = userEvent.setup();
    open(<FriendsHome />);
    await screen.findByText("Invited you to Àjọ");
    await user.click(screen.getByRole("button", { name: "Add NGOZI E" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You have a lot of requests waiting.",
    );
    await user.click(screen.getByRole("button", { name: "Add NGOZI E" }));
    expect(
      await screen.findByRole("button", { name: /Cancel your request to NGOZI E/ }),
    ).toBeInTheDocument();
    expect(json(sent(mock, "POST /api/friends/requests")[1]!)).toEqual({ username: "ngozi_e" });
  });
});

describe("finding people", () => {
  it("waits for three letters and a pause in typing, then shows who it found with how they are related", async () => {
    const mock = api({
      "GET /api/friends/search": (_i, url) => ({
        status: 200,
        body:
          new URL(url!, "http://app").searchParams.get("q") === "chi"
            ? [person("chidi_o", { relation: "friend", mutualFriends: 2 }), person("chika_n")]
            : [],
      }),
    });
    const user = userEvent.setup();
    open(<FindPeople />);
    const box = await screen.findByRole("textbox", { name: "Username" });
    await user.type(box, "ch");
    expect(screen.getByText(/at least 3 letters/)).toBeInTheDocument();
    expect(sent(mock, "GET /api/friends/search")).toHaveLength(0);
    await user.type(box, "i");
    const results = await screen.findByRole("list", { name: "Results" });
    expect(within(results).getAllByRole("listitem")).toHaveLength(2);
    expect(within(results).getByText("2 in common")).toBeInTheDocument();
    expect(within(results).getByText("Friends")).toBeInTheDocument();
    expect(within(results).getByRole("button", { name: "Add CHIKA N" })).toBeInTheDocument();
    // One request for the pause, not one for each letter.
    expect(sent(mock, "GET /api/friends/search")).toHaveLength(1);
    expect(SEARCH_DELAY_MS).toBeGreaterThan(0);
  });

  it("says plainly when nobody is found, and tidies an @ and capitals", async () => {
    const mock = api({ "GET /api/friends/search": () => ({ status: 200, body: [] }) });
    const user = userEvent.setup();
    open(<FindPeople />);
    await user.type(await screen.findByRole("textbox", { name: "Username" }), "@ZZZ");
    expect(await screen.findByRole("status")).toHaveTextContent(/No one found/);
    expect(String(sent(mock, "GET /api/friends/search")[0]![0])).toContain("q=zzz");
  });

  it("is honest about contacts and nearby: not yet, and why", async () => {
    api({});
    open(<FindPeople />);
    const later = await screen.findByRole("region", { name: "Coming later" });
    expect(within(later).getByText(/needs a verified phone number/)).toBeInTheDocument();
    expect(within(later).getByText(/never where you are/)).toBeInTheDocument();
  });

  it("shows the API's refusal when searching fails", async () => {
    api({
      "GET /api/friends/search": () => ({
        status: 403,
        body: { message: "Finish verifying your identity first.", code: "kyc_required" },
      }),
    });
    const user = userEvent.setup();
    open(<FindPeople />);
    await user.type(await screen.findByRole("textbox", { name: "Username" }), "ada");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Finish verifying your identity first.",
    );
  });
});

describe("one person", () => {
  const view = (relation: string) => ({
    "GET /api/friends/people/chidi_o": () => ({
      status: 200,
      body: person("chidi_o", { relation, mutualFriends: 3 }),
    }),
  });

  it("shows who they are and what you share, and adds them", async () => {
    const mock = api({
      ...view("none"),
      "POST /api/friends/requests": () => ({ status: 200, body: { relation: "requested" } }),
    });
    const user = userEvent.setup();
    open(<PersonScreen username="chidi_o" />);
    expect(await screen.findByText("3 friends in common")).toBeInTheDocument();
    expect(screen.getByText("@chidi_o")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add as a friend" }));
    expect(await screen.findByRole("button", { name: "Cancel your request" })).toBeInTheDocument();
    expect(json(sent(mock, "POST /api/friends/requests")[0]!)).toEqual({ username: "chidi_o" });
  });

  it("accepts or says not now to someone who asked you", async () => {
    const mock = api({
      ...view("incoming"),
      "POST /api/friends/chidi_o/accept": () => ({ status: 200, body: { relation: "friend" } }),
    });
    const user = userEvent.setup();
    open(<PersonScreen username="chidi_o" />);
    await user.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByText("You're friends.")).toBeInTheDocument();
    expect(sent(mock, "POST /api/friends/chidi_o/accept")).toHaveLength(1);
  });

  it("removes a friend only after asking, and says they are not told", async () => {
    const mock = api({
      ...view("friend"),
      "POST /api/friends/chidi_o/remove": () => ({ status: 204 }),
    });
    const user = userEvent.setup();
    open(<PersonScreen username="chidi_o" />);
    await user.click(await screen.findByRole("button", { name: "Remove from friends" }));
    expect(screen.getByText(/won.t be told/)).toBeInTheDocument();
    expect(sent(mock, "POST /api/friends/chidi_o/remove")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("button", { name: "Add as a friend" })).toBeInTheDocument();
  });

  it("blocks only after explaining what it does, then goes back to the friends", async () => {
    const mock = api({ ...view("none"), "POST /api/friends/blocks": () => ({ status: 204 }) });
    const user = userEvent.setup();
    open(<PersonScreen username="chidi_o" />);
    await user.click(await screen.findByRole("button", { name: "Block" }));
    expect(screen.getByText(/They won.t be told/)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Block" }).at(-1)!);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/friends"));
    expect(json(sent(mock, "POST /api/friends/blocks")[0]!)).toEqual({ username: "chidi_o" });
  });

  it("reports with a reason, and thanks the person", async () => {
    const mock = api({ ...view("none"), "POST /api/friends/reports": () => ({ status: 204 }) });
    const user = userEvent.setup();
    open(<PersonScreen username="chidi_o" />);
    await user.click(await screen.findByRole("button", { name: "Report" }));
    expect(screen.getByRole("button", { name: "Send report" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Scam" }));
    await user.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText("Thank you. We'll look into it.")).toBeInTheDocument();
    expect(json(sent(mock, "POST /api/friends/reports")[0]!)).toEqual({
      username: "chidi_o",
      reason: "scam",
    });
  });

  it("says there is no such person, the same whether they are blocked or not there", async () => {
    api({
      "GET /api/friends/people/chidi_o": () => ({
        status: 404,
        body: { message: "We couldn't find that person.", code: "person_not_found" },
      }),
    });
    open(<PersonScreen username="chidi_o" />);
    expect(await screen.findByText("We couldn't find that person.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to friends" })).toHaveAttribute(
      "href",
      "/friends",
    );
  });
});

describe("requests and blocked people", () => {
  it("answers requests to you and takes back requests from you", async () => {
    const mock = api({
      "GET /api/friends/requests": () => ({
        status: 200,
        body: {
          incoming: [
            { username: "tunde_b", displayName: "Tunde", sentAt: "2026-10-03T00:00:00Z", tier: 1 },
            { username: "kemi_s", displayName: "Kemi", sentAt: "2026-10-03T00:00:00Z", tier: 2 },
          ],
          outgoing: [
            { username: "sade_k", displayName: "Sade", sentAt: "2026-10-03T00:00:00Z", tier: 1 },
          ],
        },
      }),
      "POST /api/friends/tunde_b/accept": () => ({ status: 200, body: { relation: "friend" } }),
      "POST /api/friends/kemi_s/decline": () => ({ status: 204 }),
      "POST /api/friends/sade_k/cancel": () => ({ status: 204 }),
    });
    const user = userEvent.setup();
    open(<RequestsScreen />);
    await user.click(await screen.findByRole("button", { name: "Accept Tunde" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Accept Tunde" })).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Decline Kemi" }));
    await user.click(screen.getByRole("button", { name: "Cancel your request to Sade" }));
    expect(await screen.findByText("No one is waiting for an answer.")).toBeInTheDocument();
    expect(screen.getByText("You haven't any requests waiting.")).toBeInTheDocument();
    expect(sent(mock, "POST /api/friends/tunde_b/accept")).toHaveLength(1);
  });

  it("lists the blocked and unblocks one", async () => {
    const mock = api({
      "GET /api/friends/blocks": () => ({
        status: 200,
        body: [
          { username: "rude_one", displayName: "Rude One", blockedAt: "2026-10-01T00:00:00Z" },
        ],
      }),
      "POST /api/friends/rude_one/unblock": () => ({ status: 204 }),
    });
    const user = userEvent.setup();
    open(<BlockedScreen />);
    await user.click(await screen.findByRole("button", { name: "Unblock Rude One" }));
    expect(await screen.findByText("You haven't blocked anyone.")).toBeInTheDocument();
    expect(sent(mock, "POST /api/friends/rude_one/unblock")).toHaveLength(1);
  });
});

describe("inviting", () => {
  it("shows the code and link, and gives WhatsApp and text links with the message in them", async () => {
    api({
      "GET /api/friends/invite": () => ({
        status: 200,
        body: { code: "K7M2QH9R", link: "https://app.ajo.test/join/K7M2QH9R" },
      }),
    });
    open(<InviteScreen />);
    expect(await screen.findByText("K7M2QH9R")).toBeInTheDocument();
    const whatsapp = screen.getByRole("link", { name: "Send on WhatsApp" });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(whatsapp.getAttribute("href")!)).toContain(
      "https://app.ajo.test/join/K7M2QH9R",
    );
    expect(whatsapp).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: "Text message" }).getAttribute("href")).toMatch(
      /^sms:/,
    );
  });

  it("copies the link", async () => {
    api({
      "GET /api/friends/invite": () => ({
        status: 200,
        body: { code: "K7M2QH9R", link: "https://app.ajo.test/join/K7M2QH9R" },
      }),
    });
    const user = userEvent.setup();
    open(<InviteScreen />);
    await user.click(await screen.findByRole("button", { name: "Copy link" }));
    expect(await navigator.clipboard.readText()).toBe("https://app.ajo.test/join/K7M2QH9R");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});

describe("opening an invite link before having an account", () => {
  it("says who it is from and carries the code into sign-up", async () => {
    const mock = api({
      "GET /api/invites/K7M2QH9R": () => ({
        status: 200,
        body: { name: "Ada", username: "ada_ola" },
      }),
    });
    render(<JoinScreen code="K7M2QH9R" />);
    expect(
      await screen.findByRole("heading", { name: "Ada invited you to Àjọ" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/@ada_ola/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create my account" })).toHaveAttribute(
      "href",
      "/sign-up?invite=K7M2QH9R",
    );
    expect(screen.getByRole("link", { name: "I already have an account" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(sent(mock, "GET /api/invites/K7M2QH9R")).toHaveLength(1);
  });

  it("still welcomes someone with a code that means nothing, without a name and without carrying it on", async () => {
    api({
      "GET /api/invites/ZZZZZZZZ": () => ({
        status: 404,
        body: { message: "That invite isn't valid." },
      }),
    });
    render(<JoinScreen code="ZZZZZZZZ" />);
    expect(await screen.findByRole("heading", { name: "Welcome to Àjọ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create my account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });
});
