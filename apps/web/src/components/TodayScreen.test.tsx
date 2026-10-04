import { render, screen, waitFor } from "@testing-library/react";
import { TodayScreen } from "./TodayScreen";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => vi.unstubAllGlobals());

describe("TodayScreen", () => {
  it("greets the person and has a way to their account, always in reach", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true })
          : Response.json({ wallets: [] }),
      ),
    );
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "Hello, Ada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me" })).toHaveAttribute("href", "/me");
  });

  const signedIn = (mfaEnabled: boolean) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true, mfaEnabled })
          : Response.json({ wallets: [] }),
      ),
    );

  it("nudges toward the second lock until it is on, because money cannot move without it", async () => {
    signedIn(false);
    render(<TodayScreen />);
    const nudge = await screen.findByRole("link", { name: /Add a second lock/ });
    expect(nudge).toHaveAttribute("href", "/me/security");
  });

  it("stops nudging once the second lock is on", async () => {
    signedIn(true);
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "Hello, Ada" });
    expect(screen.queryByRole("link", { name: /second lock/i })).not.toBeInTheDocument();
  });

  it("invites someone to get their passport stamped until they are approved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({
              displayName: "Ada",
              email: "a@b.co",
              onboarded: true,
              mfaEnabled: true,
              kycStatus: "in_progress",
            })
          : Response.json({ wallets: [] }),
      ),
    );
    render(<TodayScreen />);
    const card = await screen.findByRole("link", { name: /passport/i });
    expect(card).toHaveAttribute("href", "/verify");
  });

  it("stops asking once the passport is approved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({
              displayName: "Ada",
              email: "a@b.co",
              onboarded: true,
              mfaEnabled: true,
              kycStatus: "approved",
            })
          : Response.json({ wallets: [] }),
      ),
    );
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "Hello, Ada" });
    expect(screen.queryByRole("link", { name: /passport/i })).not.toBeInTheDocument();
  });

  describe("saving and messages", () => {
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
    function api(plans: object[], unread: number, order: string[] = []) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          order.push(url);
          if (url === "/api/me")
            return Response.json({
              displayName: "Ada",
              email: "a@b.co",
              onboarded: true,
              mfaEnabled: true,
            });
          if (url === "/api/wallet") return Response.json({ wallets: [] });
          if (url === "/api/savings") return Response.json({ plans });
          if (url.startsWith("/api/notifications"))
            return Response.json({ items: [], next: null, unread });
          return new Response(null, { status: 404 });
        }),
      );
    }

    it("shows what is saved and when the next debit is, and a way into savings", async () => {
      api(
        [
          plan(),
          plan({
            id: "p2",
            saved: naira("100000"),
            nextDebit: { dueOn: "2026-11-02", amount: naira("100000") },
          }),
        ],
        0,
      );
      render(<TodayScreen />);
      const card = await screen.findByRole("link", { name: /Savings/ });
      expect(card).toHaveAttribute("href", "/save");
      expect(card).toHaveTextContent("₦6,000");
      expect(card).toHaveTextContent("in 2 pots");
      expect(card).toHaveTextContent("next Mon 2 Nov");
    });

    it("invites a first plan when there is none", async () => {
      api([], 0);
      render(<TodayScreen />);
      expect(await screen.findByText("Fill your first pot")).toBeInTheDocument();
    });

    it("shows how many messages are unread on the bell, and caps it", async () => {
      api([], 14);
      render(<TodayScreen />);
      const bell = await screen.findByRole("link", { name: "Messages, 14 unread" });
      expect(bell).toHaveAttribute("href", "/notifications");
      expect(bell).toHaveTextContent("9+");
    });

    it("has a plain bell when everything is read", async () => {
      api([], 0);
      render(<TodayScreen />);
      expect(await screen.findByRole("link", { name: "Messages" })).toBeInTheDocument();
    });

    it("asks the server for one thing at a time: the wallet, the savings, the messages, then friends", async () => {
      const order: string[] = [];
      api([plan()], 1, order);
      render(<TodayScreen />);
      await screen.findByRole("link", { name: "Messages, 1 unread" });
      await waitFor(() => expect(order).toHaveLength(5));
      expect(order).toEqual([
        "/api/me",
        "/api/wallet",
        "/api/savings",
        expect.stringContaining("/api/notifications"),
        "/api/friends",
      ]);
    });

    it("shows how many friends there are, and that someone is waiting", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url === "/api/me")
            return Response.json({
              displayName: "Ada",
              email: "a@b.co",
              onboarded: true,
              mfaEnabled: true,
            });
          if (url === "/api/wallet") return Response.json({ wallets: [] });
          if (url === "/api/savings") return Response.json({ plans: [] });
          if (url.startsWith("/api/notifications"))
            return Response.json({ items: [], next: null, unread: 0 });
          if (url === "/api/friends")
            return Response.json({
              friends: [
                { username: "a_b", displayName: "A B", since: "2026-10-01T00:00:00Z", tier: 1 },
                { username: "c_d", displayName: "C D", since: "2026-10-01T00:00:00Z", tier: 1 },
              ],
            });
          if (url === "/api/friends/requests")
            return Response.json({
              incoming: [
                { username: "x_y", displayName: "X Y", sentAt: "2026-10-01T00:00:00Z", tier: 1 },
              ],
              outgoing: [],
            });
          return new Response(null, { status: 404 });
        }),
      );
      render(<TodayScreen />);
      const card = await screen.findByRole("link", { name: /Friends/ });
      expect(card).toHaveAttribute("href", "/friends");
      expect(card).toHaveTextContent("2 friends");
      expect(card).toHaveTextContent("1 request is waiting");
    });

    it("shows no friends card when friends cannot be had", async () => {
      api([], 0);
      render(<TodayScreen />);
      await screen.findByText("Fill your first pot");
      expect(screen.queryByRole("link", { name: /Friends/ })).not.toBeInTheDocument();
    });

    it("shows less, quietly, when savings or messages cannot be had", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url === "/api/me")
            return Response.json({
              displayName: "Ada",
              email: "a@b.co",
              onboarded: true,
              mfaEnabled: true,
            });
          if (url === "/api/wallet") return Response.json({ wallets: [] });
          return Response.json({}, { status: 502 });
        }),
      );
      render(<TodayScreen />);
      await screen.findByRole("heading", { name: "Hello, Ada" });
      expect(screen.queryByRole("link", { name: /Savings/ })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    });
  });
});
