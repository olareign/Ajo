import { render, screen, waitFor } from "@testing-library/react";
import { forgetAll, remember } from "@/lib/visit-cache";
import { ScreenHeader } from "./ScreenHeader";

afterEach(() => {
  vi.unstubAllGlobals();
  forgetAll();
});

const me = {
  displayName: "Ada Ola",
  email: "a@b.c",
  onboarded: true,
  username: "ada_ola",
  photoVersion: 99,
};

describe("the top bar on tab screens", () => {
  it("shows your picture (opening Me), the title as the page heading, help and messages", async () => {
    remember("me", me);
    remember("unread", 0);
    render(<ScreenHeader tab title="Savings" subtitle="Little by little, the pot fills." />);
    expect(screen.getByRole("heading", { level: 1, name: "Savings" })).toBeInTheDocument();
    const mine = screen.getByRole("link", { name: "Me" });
    expect(mine).toHaveAttribute("href", "/me");
    expect(mine.querySelector("img")).toHaveAttribute("src", "/api/photo/ada_ola?v=99");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.getByText("Little by little, the pot fills.")).toBeInTheDocument();
  });

  it("falls back to the stand-in when there is no picture", () => {
    remember("me", { ...me, photoVersion: null });
    remember("unread", 0);
    render(<ScreenHeader tab title="Wallet" />);
    expect(screen.getByRole("link", { name: "Me" }).querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "Me" }).querySelector("svg")).not.toBeNull();
  });

  it("asks once how many messages are unread, and shows the count on the bell", async () => {
    remember("me", me);
    const fetchMock = vi.fn(async () => Response.json({ unread: 12 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ScreenHeader tab title="Circles" />);
    expect(await screen.findByRole("link", { name: "Messages, 12 unread" })).toHaveTextContent(
      "9+",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications?limit=1", expect.anything());
  });

  it("does not ask when the screen supplies the count, or the visit already knows it", async () => {
    remember("me", me);
    const fetchMock = vi.fn(async () => Response.json({ unread: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = render(<ScreenHeader tab title="Today" unread={3} />);
    expect(screen.getByRole("link", { name: "Messages, 3 unread" })).toBeInTheDocument();
    first.unmount();
    remember("unread", 5);
    render(<ScreenHeader tab title="Today" unread={null} />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Messages, 5 unread" })).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("inner screens keep their back arrow and have no help or bell", () => {
    render(<ScreenHeader tab title="Password" backHref="/me" />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/me");
    expect(screen.queryByRole("link", { name: "Support" })).toBeNull();
  });
});
