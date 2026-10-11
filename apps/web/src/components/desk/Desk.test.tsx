import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopHeader } from "@/components/DesktopHeader";
import { TransactionList } from "@/components/wallet/TransactionList";
import { forgetAll, remember, useRecall } from "@/lib/visit-cache";
import type { WalletTransaction } from "@/lib/wallet";
import { MonthPanel } from "./MonthPanel";
import { PaymentDetails } from "./PaymentDetails";

/** A screen this wide or not: stands in for the browser's media query. */
function screenIsWide(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}
const fetches = (routes: Record<string, unknown>) => {
  const mock = vi.fn(async (url: string) => {
    const path = url.split("?")[0]!;
    return path in routes
      ? Response.json(routes[path])
      : Response.json({ message: "nope" }, { status: 500 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};
afterEach(() => {
  vi.unstubAllGlobals();
  forgetAll();
});

const tx = (over: Partial<WalletTransaction>): WalletTransaction => ({
  id: "e1",
  transactionId: "8d0f6a0e-1111-4c2b-9a77-1234567890ab",
  type: "funding",
  account: "available",
  direction: "in",
  amount: { amount: "1550000", currency: "NGN" },
  currency: "NGN",
  createdAt: "2026-10-06T13:48:00Z",
  ...over,
});
const month = {
  month: "2026-10",
  currency: "NGN",
  moneyIn: "2400000",
  moneyOut: "532400",
  savedNet: "0",
  endAvailable: "11365000",
  endSavings: "0",
  endLocked: "0",
};

describe("the desk header", () => {
  it("welcomes the person once their details arrive, with help, notifications and their picture", () => {
    screenIsWide(true);
    fetches({ "/api/notifications": { unread: 3 } });
    render(<DesktopHeader wide />);
    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
    act(() => remember("me", { displayName: "Ada Ola", username: "ada" }));
    expect(screen.getByText("Hello Ada, welcome back!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/me/help");
    expect(screen.getByRole("link", { name: "Me" })).toHaveAttribute("href", "/me");
  });

  it("shows the unread count, and never asks for it on a phone", async () => {
    const asked = fetches({ "/api/notifications": { unread: 3 } });
    const { unmount } = render(<DesktopHeader wide={false} />);
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument();
    expect(asked).not.toHaveBeenCalled();
    unmount();
    render(<DesktopHeader wide />);
    expect(await screen.findByRole("link", { name: "Notifications, 3 unread" })).toHaveTextContent(
      "3",
    );
  });
});

describe("this month", () => {
  it("shows what's in the wallet, money in and out, and the latest payments", async () => {
    screenIsWide(true);
    fetches({
      "/api/wallet/insights": { months: [month] },
      "/api/wallet/transactions": {
        items: [tx({}), tx({ id: "e2", type: "withdrawal", direction: "out" })],
        next: null,
      },
    });
    render(<MonthPanel currency="NGN" recent />);
    const panel = screen.getByRole("region", { name: "This month" });
    expect(await within(panel).findByText("₦113,650")).toBeInTheDocument();
    expect(within(panel).getAllByText("Money in").length).toBeGreaterThan(0);
    expect(within(panel).getByText("₦24,000")).toBeInTheDocument();
    expect(within(panel).getByText("₦5,324")).toBeInTheDocument();
    const latest = await within(panel).findByRole("list", { name: "Latest payments" });
    expect(within(latest).getAllByRole("listitem")).toHaveLength(2);
    expect(within(panel).getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/wallet");
  });

  it("draws nothing and asks for nothing on a phone", () => {
    screenIsWide(false);
    const asked = fetches({});
    const { container } = render(<MonthPanel currency="NGN" recent />);
    expect(container).toBeEmptyDOMElement();
    expect(asked).not.toHaveBeenCalled();
  });

  it("says so when nothing has moved this month", async () => {
    screenIsWide(true);
    fetches({ "/api/wallet/insights": { months: [] } });
    render(<MonthPanel currency="NGN" />);
    expect(await screen.findByText("Nothing has moved this month yet.")).toBeInTheDocument();
  });
});

describe("activity and payment details on a desk", () => {
  it("groups activity by day and opens a payment beside the list", async () => {
    const user = userEvent.setup();
    const picked = vi.fn();
    render(
      <TransactionList
        items={[
          tx({}),
          tx({ id: "e2", createdAt: "2026-10-06T09:00:00Z", direction: "out" }),
          tx({ id: "e3", createdAt: "2026-10-01T09:00:00Z" }),
        ]}
        onSelect={picked}
        selectedId="e2"
      />,
    );
    expect(screen.getByRole("region", { name: /Tue,? 6 Oct/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Thu,? 1 Oct/ })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    await user.click(buttons[0]!);
    expect(picked).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("stays a plain list on a phone", () => {
    render(<TransactionList items={[tx({})]} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("list", { name: "Recent activity" })).toBeInTheDocument();
  });

  it("shows the payment's amount, part of the money, time and a reference to copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { rerender } = render(<PaymentDetails item={undefined} />);
    expect(screen.getByText("Pick a payment to see its details.")).toBeInTheDocument();
    rerender(<PaymentDetails item={tx({})} />);
    const panel = screen.getByRole("region", { name: "Payment details" });
    expect(within(panel).getByText("Money added")).toBeInTheDocument();
    expect(within(panel).getByText("₦15,500")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Statement/ })).toHaveAttribute(
      "href",
      "/wallet/statements",
    );
    await user.click(within(panel).getByRole("button", { name: "Copy reference" }));
    expect(writeText).toHaveBeenCalledWith("8d0f6a0e-1111-4c2b-9a77-1234567890ab");
    expect(
      await within(panel).findByRole("button", { name: "Reference copied" }),
    ).toBeInTheDocument();
  });
});

describe("what a visit remembers, live", () => {
  it("updates when a value arrives and when everything is forgotten", () => {
    const { result } = renderHook(() => useRecall<number>("unread"));
    expect(result.current).toBeUndefined();
    act(() => remember("unread", 4));
    expect(result.current).toBe(4);
    act(() => forgetAll());
    expect(result.current).toBeUndefined();
  });
});
