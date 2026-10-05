import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletSummary } from "./WalletSummary";

const wallet = (currency: string, available: string) => ({
  currency,
  available: { amount: available, currency },
  locked: { amount: "0", currency },
  savings: { amount: "0", currency },
});

afterEach(() => localStorage.clear());

describe("WalletSummary", () => {
  it("shows what is available in each currency, as one link to the wallet", () => {
    render(<WalletSummary wallets={[wallet("NGN", "250000"), wallet("GBP", "1250")]} />);
    const link = screen.getByRole("link", { name: /wallet/i });
    expect(link).toHaveAttribute("href", "/wallet");
    expect(link).toHaveTextContent("₦2,500");
    expect(link).toHaveTextContent("£12.50");
    expect(link).toHaveTextContent("Available");
  });

  it("says there is nothing yet, and still leads to the wallet", () => {
    render(<WalletSummary wallets={[]} />);
    expect(screen.getByRole("link", { name: /wallet/i })).toHaveTextContent("Nothing here yet");
  });

  it("reads as zero in the person's own currency when the wallet is empty", () => {
    render(<WalletSummary wallets={[]} currency="NGN" />);
    const link = screen.getByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("₦0");
    expect(link).toHaveTextContent("Available");
  });

  it("does not guess a balance when it cannot load one, and shows a placeholder while loading", () => {
    const failed = render(<WalletSummary wallets={null} />);
    const link = screen.getByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("Tap to see your balance");
    expect(link).not.toHaveTextContent("₦");
    failed.unmount();
    render(<WalletSummary wallets={undefined} />);
    expect(screen.getByRole("link", { name: /wallet/i })).toHaveTextContent("Loading…");
  });
});

describe("hiding the balance", () => {
  it("hides and shows it, and remembers the choice", async () => {
    const user = userEvent.setup();
    const first = render(<WalletSummary wallets={[wallet("NGN", "250000")]} />);
    const link = screen.getByRole("link", { name: /wallet/i });
    expect(link).toHaveTextContent("₦2,500");
    await user.click(screen.getByRole("button", { name: "Hide balance" }));
    expect(link).not.toHaveTextContent("₦2,500");
    expect(link).toHaveTextContent("Balance hidden");
    expect(screen.getByRole("button", { name: "Show balance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    first.unmount();

    render(<WalletSummary wallets={[wallet("NGN", "250000")]} />);
    const again = screen.getByRole("link", { name: /wallet/i });
    expect(again).toHaveTextContent("Balance hidden");
    expect(again).not.toHaveTextContent("₦2,500");
  });

  it("offers adding money and withdrawing straight from the card", () => {
    render(<WalletSummary wallets={[]} />);
    expect(screen.getByRole("link", { name: "Add money" })).toHaveAttribute("href", "/wallet/add");
    expect(screen.getByRole("link", { name: "Withdraw" })).toHaveAttribute(
      "href",
      "/wallet/withdraw",
    );
  });
});
