import { render, screen, waitFor } from "@testing-library/react";
import { WalletSummary } from "./WalletSummary";

const replace = vi.fn();
// Like Next's own router, one object for the life of the page: a new one every render would
// re-run every effect that lists it.
const router = { replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const wallet = (currency: string, available: string) => ({
  currency,
  available: { amount: available, currency },
  locked: { amount: "0", currency },
  savings: { amount: "0", currency },
});
const answer = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );

describe("WalletSummary", () => {
  it("shows what is available in each currency, as one link to the wallet", async () => {
    answer(200, { wallets: [wallet("NGN", "250000"), wallet("GBP", "1250")] });
    render(<WalletSummary />);

    const link = await screen.findByRole("link", { name: /wallet/i });
    expect(link).toHaveAttribute("href", "/wallet");
    expect(link).toHaveTextContent("₦2,500");
    expect(link).toHaveTextContent("£12.50");
    expect(link).toHaveTextContent("Available");
  });

  it("says there is nothing yet, and still leads to the wallet", async () => {
    answer(200, { wallets: [] });
    render(<WalletSummary />);
    const link = await screen.findByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("Nothing here yet");
  });

  it("reads as zero in the person's own currency when the wallet is empty", async () => {
    answer(200, { wallets: [] });
    render(<WalletSummary currency="NGN" />);
    const link = await screen.findByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("₦0");
    expect(link).toHaveTextContent("Available");
  });

  it("does not guess a balance when it cannot load one", async () => {
    answer(502, { message: "down" });
    render(<WalletSummary />);
    const link = await screen.findByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("Tap to see your balance");
    expect(link).not.toHaveTextContent("₦");
  });

  it("sends a signed-out person to sign in", async () => {
    answer(401);
    render(<WalletSummary />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});

describe("hiding the balance", () => {
  afterEach(() => localStorage.clear());

  it("hides and shows it, and remembers the choice", async () => {
    answer(200, { wallets: [wallet("NGN", "250000")] });
    const user = (await import("@testing-library/user-event")).default.setup();
    const first = render(<WalletSummary />);
    const link = await screen.findByRole("link", { name: /wallet/i });
    await waitFor(() => expect(link).toHaveTextContent("₦2,500"));
    await user.click(screen.getByRole("button", { name: "Hide balance" }));
    expect(link).not.toHaveTextContent("₦2,500");
    expect(link).toHaveTextContent("Balance hidden");
    expect(screen.getByRole("button", { name: "Show balance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    first.unmount();

    render(<WalletSummary />);
    const again = await screen.findByRole("link", { name: /wallet/i });
    await waitFor(() => expect(again).toHaveTextContent("Balance hidden"));
    expect(again).not.toHaveTextContent("₦2,500");
  });

  it("offers adding money and withdrawing straight from the card", async () => {
    answer(200, { wallets: [] });
    render(<WalletSummary />);
    expect(await screen.findByRole("link", { name: "Add money" })).toHaveAttribute(
      "href",
      "/wallet/add",
    );
    expect(screen.getByRole("link", { name: "Withdraw" })).toHaveAttribute(
      "href",
      "/wallet/withdraw",
    );
  });
});
