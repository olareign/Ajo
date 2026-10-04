import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletScreen } from "./WalletScreen";

const replace = vi.fn();
// Like Next's own router, one object for the life of the page: a new one every render would
// re-run every effect that lists it.
const router = { replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const money = (amount: string, currency = "NGN") => ({ amount, currency });
const naira = {
  currency: "NGN",
  available: money("250000"),
  locked: money("50000"),
  savings: money("1000000"),
};
const pounds = {
  currency: "GBP",
  available: money("1250", "GBP"),
  locked: money("0", "GBP"),
  savings: money("0", "GBP"),
};
const row = (id: string, over: object = {}) => ({
  id,
  transactionId: `t${id}`,
  type: "funding",
  account: "available",
  direction: "in",
  amount: money("250000"),
  currency: "NGN",
  createdAt: "2026-10-03T12:00:00.000Z",
  ...over,
});

type Routes = Record<string, () => Response | Promise<Response>>;
/** Answers each path (query ignored) from `routes`; the person is onboarded unless said otherwise. */
function stubApi(routes: Routes) {
  const all: Routes = {
    "/api/me": () => Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true }),
    ...routes,
  };
  const fetchMock = vi.fn(async (url: string) => {
    const handler = all[new URL(url, "http://app").pathname];
    return handler ? handler() : Response.json({}, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const wallets =
  (...list: object[]) =>
  () =>
    Response.json({ wallets: list });
const history =
  (items: object[], next: string | null = null) =>
  () =>
    Response.json({ items, next });

describe("WalletScreen", () => {
  it("shows what is available, locked and in savings, per currency", async () => {
    stubApi({ "/api/wallet": wallets(naira, pounds), "/api/wallet/transactions": history([]) });
    render(<WalletScreen />);

    const ngn = await screen.findByRole("region", { name: "Nigerian Naira wallet" });
    expect(within(ngn).getByText("Available").nextElementSibling).toHaveTextContent("₦2,500");
    expect(within(ngn).getByText("Locked").nextElementSibling).toHaveTextContent("₦500");
    expect(within(ngn).getByText("Savings").nextElementSibling).toHaveTextContent("₦10,000");

    const gbp = screen.getByRole("region", { name: "British Pound wallet" });
    expect(within(gbp).getByText("Available").nextElementSibling).toHaveTextContent("£12.50");
  });

  it("says plainly when there is no money yet", async () => {
    stubApi({ "/api/wallet": wallets(), "/api/wallet/transactions": history([]) });
    render(<WalletScreen />);
    expect(await screen.findByText(/No money here yet/)).toBeInTheDocument();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("lists activity in words, with money in and out told apart without colour", async () => {
    stubApi({
      "/api/wallet": wallets(naira),
      "/api/wallet/transactions": history([
        row("2", { type: "withdrawal", direction: "out", amount: money("100000") }),
        row("1"),
      ]),
    });
    render(<WalletScreen />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Withdrawal");
    expect(items[0]).toHaveTextContent("Money out");
    expect(items[0]).toHaveTextContent("-₦1,000");
    expect(items[0]).toHaveTextContent(/Available · \d{1,2} Oct 2026/);
    expect(items[1]).toHaveTextContent("Money added");
    expect(items[1]).toHaveTextContent("Money in");
    expect(items[1]).toHaveTextContent("+₦2,500");
  });

  it("loads the next page only when asked, and stops offering it at the end", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi({
      "/api/wallet": wallets(naira),
      "/api/wallet/transactions": vi
        .fn()
        .mockImplementationOnce(history([row("2")], "2"))
        .mockImplementationOnce(history([row("1", { type: "withdrawal" })], null)),
    });
    render(<WalletScreen />);

    await user.click(await screen.findByRole("button", { name: "Show more" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/wallet/transactions?limit=20&before=2",
      expect.anything(),
    );
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });

  it("asks for balances and history one after the other, never together", async () => {
    // The session's refresh token is single-use: two calls racing on an expired token would each
    // try to swap it, and the second would end the session.
    let balancesDone = false;
    stubApi({
      "/api/wallet": async () => {
        await new Promise((r) => setTimeout(r, 20));
        balancesDone = true;
        return Response.json({ wallets: [naira] });
      },
      "/api/wallet/transactions": () => {
        expect(balancesDone).toBe(true);
        return Response.json({ items: [], next: null });
      },
    });
    render(<WalletScreen />);
    await screen.findByText("No activity yet.");
  });

  it("says so when it cannot load, and tries again when asked", async () => {
    const user = userEvent.setup();
    const balances = vi
      .fn()
      .mockImplementationOnce(() => Response.json({ message: "down" }, { status: 502 }))
      .mockImplementation(wallets(naira));
    stubApi({ "/api/wallet": balances, "/api/wallet/transactions": history([]) });
    render(<WalletScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your wallet.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Nigerian Naira wallet" })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps what is on screen when a later page fails", async () => {
    const user = userEvent.setup();
    stubApi({
      "/api/wallet": wallets(naira),
      "/api/wallet/transactions": vi
        .fn()
        .mockImplementationOnce(history([row("2")], "2"))
        .mockImplementationOnce(() => Response.json({}, { status: 502 })),
    });
    render(<WalletScreen />);

    await user.click(await screen.findByRole("button", { name: "Show more" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load more.");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Show more" })).toBeEnabled();
  });

  it("sends a signed-out person to sign in", async () => {
    stubApi({ "/api/wallet": () => Response.json({}, { status: 401 }) });
    render(<WalletScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("sends someone who has not finished onboarding to onboarding", async () => {
    stubApi({
      "/api/me": () => Response.json({ displayName: "Ada", email: "a@b.co", onboarded: false }),
    });
    render(<WalletScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("puts adding and withdrawing money, auto-debit and limits within reach", async () => {
    stubApi({ "/api/wallet": wallets(), "/api/wallet/transactions": history([]) });
    render(<WalletScreen />);
    expect(await screen.findByRole("link", { name: "Add money" })).toHaveAttribute(
      "href",
      "/wallet/add",
    );
    expect(screen.getByRole("link", { name: "Withdraw" })).toHaveAttribute(
      "href",
      "/wallet/withdraw",
    );
    expect(screen.getByRole("link", { name: /Auto-debit/ })).toHaveAttribute(
      "href",
      "/wallet/mandate",
    );
    expect(screen.getByRole("link", { name: /Your limits/ })).toHaveAttribute(
      "href",
      "/wallet/limits",
    );
  });
});
