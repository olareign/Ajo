import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ago, NotificationsScreen } from "./NotificationsScreen";
import { forgetAll } from "@/lib/visit-cache";

const replace = vi.fn();
const push = vi.fn();
const router = { replace, push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const notice = (id: string, over: object = {}) => ({
  id,
  kind: "plan.debit_paid",
  title: `Title ${id}`,
  body: `Body ${id}`,
  link: `/save/${id}`,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  readAt: null,
  ...over,
});
type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
function api(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url, "http://app").pathname;
    if (path === "/api/me")
      return Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true });
    const handler = handlers[`${init?.method ?? "GET"} ${path}`];
    return handler ? handler(url, init) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const posted = (mock: ReturnType<typeof api>, path: string) =>
  mock.mock.calls.filter(
    ([url, init]) =>
      new URL(url as string, "http://app").pathname === path && init?.method === "POST",
  );

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  push.mockReset();
});

describe("how long ago", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  it.each([
    ["2026-10-04T11:59:40Z", /^Just now$/],
    ["2026-10-04T11:55:00Z", /^5 min ago$/],
    ["2026-10-04T11:00:00Z", /^1 hour ago$/],
    ["2026-10-04T07:00:00Z", /^5 hours ago$/],
    ["2026-10-03T09:00:00Z", /^Yesterday$/],
    ["2026-10-01T09:00:00Z", /^3 days ago$/],
    ["2026-09-20T09:00:00Z", /^20 Sep/],
  ])("%s reads as %s", (iso, words) => {
    expect(ago(iso, now)).toMatch(words);
  });
});

describe("the messages screen", () => {
  it("lists messages with unread ones marked, and says how many", async () => {
    api({
      "GET /api/notifications": () =>
        Response.json({
          items: [notice("a"), notice("b", { readAt: "2026-10-04T10:00:00Z" })],
          next: null,
          unread: 1,
        }),
    });
    render(<NotificationsScreen />);
    expect(await screen.findByText("Title a")).toBeInTheDocument();
    expect(screen.getByText("1 unread")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Unread" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("opens the plan a message is about, marking it read without waiting", async () => {
    const mock = api({
      "GET /api/notifications": () =>
        Response.json({ items: [notice("a")], next: null, unread: 1 }),
      "POST /api/notifications/a/read": () => new Response(null, { status: 204 }),
    });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    await user.click(await screen.findByRole("button", { name: /Title a/ }));
    expect(push).toHaveBeenCalledWith("/save/a");
    expect(screen.getByText("All read")).toBeInTheDocument();
    await waitFor(() => expect(posted(mock, "/api/notifications/a/read")).toHaveLength(1));
  });

  it("marks everything read at once", async () => {
    const mock = api({
      "GET /api/notifications": () =>
        Response.json({ items: [notice("a"), notice("b")], next: null, unread: 2 }),
      "POST /api/notifications/read-all": () => new Response(null, { status: 204 }),
    });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    await user.click(await screen.findByRole("button", { name: "Mark all as read" }));
    expect(await screen.findByText("All read")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Unread" })).not.toBeInTheDocument();
    expect(posted(mock, "/api/notifications/read-all")).toHaveLength(1);
  });

  it("loads the next page only when asked", async () => {
    const pages = [
      { items: [notice("a")], next: "5", unread: 2 },
      { items: [notice("b")], next: null, unread: 2 },
    ];
    const mock = api({ "GET /api/notifications": () => Response.json(pages.shift()) });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    await user.click(await screen.findByRole("button", { name: "Show more" }));
    expect(await screen.findByText("Title b")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
    expect(String(mock.mock.calls.at(-1)![0])).toContain("before=5");
  });

  it("is calm when there is nothing, and says so when it cannot load", async () => {
    api({ "GET /api/notifications": () => Response.json({ items: [], next: null, unread: 0 }) });
    const { unmount } = render(<NotificationsScreen />);
    expect(await screen.findByText("Nothing yet")).toBeInTheDocument();
    unmount();
    // A new visit: nothing remembered to fall back on.
    forgetAll();
    let calls = 0;
    api({
      "GET /api/notifications": () =>
        ++calls === 1
          ? Response.json({}, { status: 502 })
          : Response.json({ items: [], next: null, unread: 0 }),
    });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your messages/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Nothing yet")).toBeInTheDocument();
  });

  it("sends a signed-out person to sign in", async () => {
    api({
      "GET /api/notifications": () =>
        Response.json({ message: "Please sign in." }, { status: 401 }),
    });
    render(<NotificationsScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
