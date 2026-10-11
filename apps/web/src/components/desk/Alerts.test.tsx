import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopNav } from "@/components/DesktopNav";
import { NotificationBell } from "@/components/NotificationBell";
import { NEW_NOTIFICATIONS, UNREAD_POLL_MS, useUnread } from "@/lib/unread";
import { forgetAll } from "@/lib/visit-cache";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  forgetAll();
  replace.mockReset();
});

const unreadIs = (counts: number[]) => {
  let i = 0;
  const mock = vi.fn(async () =>
    Response.json({ unread: counts[Math.min(i++, counts.length - 1)] }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
};

describe("the bell", () => {
  it("rings and announces when new notifications arrive while the page is open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const asked = unreadIs([1, 4]);
    const { result } = renderHook(() => useUnread());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current).toBe(1);
    render(<NotificationBell count={1} className="x" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNREAD_POLL_MS + 10);
    });
    expect(asked).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(4);
    expect(screen.getByRole("status")).toHaveTextContent("3 new notifications");
  });

  it("only rings for an increase, and says one when one arrives", () => {
    render(<NotificationBell count={2} className="x" />);
    act(() => window.dispatchEvent(new CustomEvent(NEW_NOTIFICATIONS, { detail: 1 })));
    expect(screen.getByRole("status")).toHaveTextContent("1 new notification");
    expect(screen.getByRole("link", { name: "Notifications, 2 unread" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("a screen that supplies the count is not asked for it again, and a hidden bell asks for nothing", async () => {
    const asked = unreadIs([9]);
    renderHook(() => useUnread(5));
    renderHook(() => useUnread(undefined, false));
    await act(async () => {});
    expect(asked).not.toHaveBeenCalled();
  });
});

describe("signing out from the sidebar", () => {
  it("ends the session and goes to sign in", async () => {
    const user = userEvent.setup();
    const mock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mock);
    render(<DesktopNav />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mock).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
