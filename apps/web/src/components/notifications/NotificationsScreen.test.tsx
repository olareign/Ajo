import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsScreen } from "./NotificationsScreen";
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
    expect(screen.getAllByText("All read").length).toBeGreaterThan(0);
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
    expect(await screen.findByText("Nothing waiting")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Unread" })).not.toBeInTheDocument();
    expect(posted(mock, "/api/notifications/read-all")).toHaveLength(1);
  });

  it("loads the next batch only when Next is pressed on the last page loaded", async () => {
    const pages = [
      { items: [notice("a")], next: "5", unread: 2 },
      { items: [notice("b")], next: null, unread: 2 },
    ];
    const mock = api({ "GET /api/notifications": () => Response.json(pages.shift()) });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    expect(await screen.findByText("Showing 1–1 of 1+ notification")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Title b")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(String(mock.mock.calls.at(-1)![0])).toContain("before=5");
  });

  it("filters by what a message is about, or by unread, and counts each", async () => {
    api({
      "GET /api/notifications": () =>
        Response.json({
          items: [
            notice("p", { kind: "plan.debit_paid", title: "Plan paid" }),
            notice("g", {
              kind: "group.invite",
              title: "Circle invite",
              readAt: "2026-10-04T10:00:00Z",
            }),
            notice("f", { kind: "friend.request", title: "Friend asked" }),
            notice("m", { kind: "funding.succeeded", title: "Money arrived" }),
          ],
          next: null,
          unread: 3,
        }),
    });
    const user = userEvent.setup();
    render(<NotificationsScreen />);
    await screen.findByText("Plan paid");
    expect(screen.getByRole("button", { name: /^Circles/ })).toHaveTextContent("Circles1");
    await user.click(screen.getByRole("button", { name: /^Circles/ }));
    expect(screen.getByText("Circle invite")).toBeInTheDocument();
    expect(screen.queryByText("Plan paid")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Money/ }));
    expect(screen.getByText("Money arrived")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Unread/ }));
    expect(screen.queryByText("Circle invite")).not.toBeInTheDocument();
    expect(screen.getByText("Friend asked")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Saving/ }));
    expect(screen.getByText("Plan paid")).toBeInTheDocument();
    expect(screen.queryByText("Friend asked")).not.toBeInTheDocument();
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
