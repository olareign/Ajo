import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopHeader } from "@/components/DesktopHeader";
import { TransactionList } from "@/components/wallet/TransactionList";
import { forgetAll, remember, useRecall } from "@/lib/visit-cache";
import type { WalletTransaction } from "@/lib/wallet";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/today",
}));

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

describe("the desk header", () => {
  it("greets the person by the time of day and their first name, with today's date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 17, 9, 30));
    try {
      screenIsWide(true);
      fetches({ "/api/notifications": { unread: 3 } });
      render(<DesktopHeader wide />);
      expect(screen.getByText("Good morning")).toBeInTheDocument();
      act(() => remember("me", { displayName: "Ada Ola", username: "ada" }));
      expect(screen.getByText("Good morning, Ada")).toBeInTheDocument();
      expect(screen.getByText("Saturday 17 October")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/me/help");
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the account menu, moves through it with the arrows, and closes on Escape", async () => {
    screenIsWide(true);
    fetches({ "/api/notifications": { unread: 0 } });
    remember("me", { displayName: "Ada Ola", username: "ada" });
    const user = userEvent.setup();
    render(<DesktopHeader wide />);
    const button = screen.getByRole("button", { name: "Your account" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("@ada")).toBeInTheDocument();
    const profile = screen.getByRole("link", { name: "Your profile" });
    expect(profile).toHaveAttribute("href", "/me");
    expect(profile).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Your profile" })).toBeNull();
    expect(button).toHaveFocus();
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
