import { render, screen, waitFor } from "@testing-library/react";
import { TodayScreen } from "./TodayScreen";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockReset();
});

const naira = (amount: string) => ({ amount, currency: "NGN" });
const plan = (over: object = {}) => ({
  id: "p1",
  name: "Rent",
  status: "active",
  saved: naira("500000"),
  target: naira("2000000"),
  nextDebit: { dueOn: "2026-11-08", amount: naira("500000") },
  ...over,
});
const part = (data: object, status = 200) => ({ status, data });
const refused = part({ message: "Finish your passport first.", code: "kyc_required" }, 403);

type Parts = Partial<
  Record<"wallets" | "plans" | "notices" | "friends" | "requests" | "groups", object>
>;
const ALL: Parts = {
  wallets: part({ wallets: [] }),
  plans: part({ plans: [] }),
  notices: part({ items: [], next: null, unread: 0 }),
  friends: part({ friends: [] }),
  requests: part({ incoming: [], outgoing: [] }),
  groups: part({ groups: [] }),
};

/** The signed-in person and Today's one reply; returns the fetch mock to look at what was asked. */
function api(parts: Parts = {}, me: object = {}, screenStatus = 200) {
  const mock = vi.fn(async (url: string) => {
    if (url === "/api/me")
      return Response.json({
        displayName: "Ada",
        email: "a@b.co",
        onboarded: true,
        mfaEnabled: true,
        country: "NG",
        ...me,
      });
    if (url === "/api/screens/today")
      return Response.json(screenStatus === 200 ? { ...ALL, ...parts } : { message: "x" }, {
        status: screenStatus,
      });
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("TodayScreen", () => {
  it("greets the person and has a way to their account, always in reach", async () => {
    api();
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "Hello, Ada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me" })).toHaveAttribute("href", "/me");
  });

  it("asks the server once for everything Today shows", async () => {
    const mock = api();
    render(<TodayScreen />);
    await screen.findByText("Fill your first pot");
    expect(mock.mock.calls.map(([u]) => u)).toEqual(["/api/me", "/api/screens/today"]);
  });

  it("nudges toward the second lock until it is on, because money cannot move without it", async () => {
    api({}, { mfaEnabled: false });
    const first = render(<TodayScreen />);
    expect(await screen.findByRole("link", { name: /Add a second lock/ })).toHaveAttribute(
      "href",
      "/me/security",
    );
    first.unmount();
    api({}, { mfaEnabled: true });
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "Hello, Ada" });
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /second lock/i })).not.toBeInTheDocument(),
    );
  });

  it("invites someone to get their passport stamped until they are approved", async () => {
    api({}, { kycStatus: "in_progress" });
    const first = render(<TodayScreen />);
    expect(await screen.findByRole("link", { name: /passport/i })).toHaveAttribute(
      "href",
      "/verify",
    );
    first.unmount();
    api({}, { kycStatus: "approved" });
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "Hello, Ada" });
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /passport/i })).not.toBeInTheDocument(),
    );
  });

  it("shows the balance in the hero, and zero in the person's currency when the wallet is empty", async () => {
    api({
      wallets: part({
        wallets: [
          { currency: "NGN", available: naira("250000"), locked: naira("0"), savings: naira("0") },
        ],
      }),
    });
    const first = render(<TodayScreen />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Wallet balance/ })).toHaveTextContent("₦2,500"),
    );
    first.unmount();
    api();
    render(<TodayScreen />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Wallet balance/ })).toHaveTextContent("₦0"),
    );
  });

  it("shows what is saved and when the next debit is, and a way into savings", async () => {
    api({
      plans: part({
        plans: [
          plan(),
          plan({
            id: "p2",
            saved: naira("100000"),
            nextDebit: { dueOn: "2026-11-02", amount: naira("100000") },
          }),
        ],
      }),
    });
    render(<TodayScreen />);
    const card = await screen.findByRole("link", { name: /Savings/ });
    expect(card).toHaveAttribute("href", "/save");
    expect(card).toHaveTextContent("₦6,000");
    expect(card).toHaveTextContent("in 2 pots");
    expect(card).toHaveTextContent("next Mon 2 Nov");
  });

  it("shows how many messages are unread on the bell, caps it, and is plain when all are read", async () => {
    api({ notices: part({ items: [], next: null, unread: 14 }) });
    const first = render(<TodayScreen />);
    expect(await screen.findByRole("link", { name: "Messages, 14 unread" })).toHaveTextContent(
      "9+",
    );
    first.unmount();
    api();
    render(<TodayScreen />);
    await screen.findByText("Fill your first pot");
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
  });

  it("shows how many friends there are, and that someone is waiting", async () => {
    api({
      friends: part({ friends: [{ username: "a" }, { username: "b" }] }),
      requests: part({ incoming: [{ username: "x_y" }], outgoing: [] }),
    });
    render(<TodayScreen />);
    // The quick-actions "Friends" tile is always there; the card is the one that counts people.
    const card = await screen.findByRole("link", { name: /^Friends\s*\d/ });
    expect(card).toHaveAttribute("href", "/friends");
    expect(card).toHaveTextContent("2 friends");
    expect(card).toHaveTextContent("1 request is waiting");
  });

  it("shows less, quietly, when parts cannot be had (say, before the passport)", async () => {
    api({ plans: refused, friends: refused, groups: refused, notices: part({}, 502) });
    render(<TodayScreen />);
    await screen.findByRole("link", { name: /Wallet balance/ });
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Wallet balance/ })).toHaveTextContent("₦0"),
    );
    expect(screen.queryByRole("link", { name: /Savings/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Friends\s*(\d|Find)/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still shows the screen, with no balance guessed, when Today cannot be loaded", async () => {
    api({}, {}, 502);
    render(<TodayScreen />);
    expect(await screen.findByText("Tap to see your balance")).toBeInTheDocument();
  });

  it("sends a signed-out person to sign in", async () => {
    api({}, {}, 401);
    render(<TodayScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("shows what this visit already loaded at once when coming back, then refreshes", async () => {
    api({ plans: part({ plans: [plan()] }) });
    const first = render(<TodayScreen />);
    await screen.findByRole("link", { name: /Savings/ });
    first.unmount();

    // The server is slow the second time: the last copy shows before it answers.
    let answer: (r: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string) =>
          new Promise<Response>(
            (resolve) => (url === "/api/me" || url === "/api/screens/today") && (answer = resolve),
          ),
      ),
    );
    render(<TodayScreen />);
    expect(screen.getByRole("link", { name: /Savings/ })).toHaveTextContent("₦5,000");
    expect(fetch).toHaveBeenCalled();
    answer(Response.json({}));
  });
});
