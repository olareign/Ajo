import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forgetAll } from "@/lib/visit-cache";
import { SettingsScreen } from "./SettingsScreen";

const replace = vi.fn();
// Like Next's own router: one object for the life of the page.
const router = { replace, push: replace };
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  query = new URLSearchParams();
  forgetAll();
  // jsdom has no scrolling; tests that care install their own.
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

const me = {
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  emailVerified: true,
  mfaEnabled: false,
  hasPin: true,
};

type Route = () => Response | Promise<Response>;
function api(routes: Record<string, Route> = {}, profile: object = me) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/me") return Response.json(profile);
    return routes[url] ? routes[url]() : new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const posted = (fetchMock: ReturnType<typeof api>) =>
  (fetchMock.mock.calls as unknown as [string, RequestInit?][])
    .filter(([, init]) => init?.method === "POST")
    .map(([url]) => url);

describe("Settings", () => {
  it("opens on Security, with the four sections to choose from, the current one marked", async () => {
    api();
    render(<SettingsScreen />);
    const nav = await screen.findByRole("navigation", { name: "Settings sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Security",
      "Notifications",
      "Appearance and app",
      "Help and legal",
    ]);
    expect(within(nav).getByRole("link", { name: "Security" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Help and legal" })).toHaveAttribute(
      "href",
      "/settings?tab=help",
    );
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/me");
  });

  it("says whether the authenticator app is on, and leads to where it is managed", async () => {
    api();
    const { unmount } = render(<SettingsScreen />);
    const row = await screen.findByRole("link", { name: /Authenticator app/ });
    expect(row).toHaveAttribute("href", "/me/security");
    expect(within(row).getByText("Off")).toBeInTheDocument();
    expect(within(row).getByText("Set up")).toBeInTheDocument();
    unmount();
    forgetAll();

    api({}, { ...me, mfaEnabled: true });
    render(<SettingsScreen />);
    const on = await screen.findByRole("link", { name: /Authenticator app/ });
    expect(within(on).getByText("On")).toBeInTheDocument();
    expect(within(on).getByText("Manage")).toBeInTheDocument();
  });

  it("leads to the password, PIN, devices and activity screens, and quietly to closing", async () => {
    api();
    render(<SettingsScreen />);
    expect(await screen.findByRole("link", { name: /Password/ })).toHaveAttribute(
      "href",
      "/me/password",
    );
    expect(screen.getByRole("link", { name: /Transaction PIN/ })).toHaveAttribute(
      "href",
      "/me/pin",
    );
    expect(screen.getByRole("link", { name: /Devices and sign-ins/ })).toHaveAttribute(
      "href",
      "/me/devices",
    );
    expect(screen.getByRole("link", { name: /Security activity/ })).toHaveAttribute(
      "href",
      "/me/activity",
    );
    expect(screen.getByRole("link", { name: "Close your account" })).toHaveAttribute(
      "href",
      "/me/close",
    );
  });

  it("leads to email and device alerts on the Notifications section", async () => {
    query = new URLSearchParams("tab=notifications");
    api();
    render(<SettingsScreen />);
    expect(await screen.findByRole("link", { name: /Email and device alerts/ })).toHaveAttribute(
      "href",
      "/me/notifications",
    );
    expect(screen.queryByRole("link", { name: /Password/ })).toBeNull();
  });

  it("leads to help, terms and privacy, and shows which build is running", async () => {
    query = new URLSearchParams("tab=help");
    api();
    render(<SettingsScreen />);
    // Help inside the app keeps the app's frame; /help is the public page.
    expect(await screen.findByRole("link", { name: /Help and support/ })).toHaveAttribute(
      "href",
      "/me/help",
    );
    expect(screen.getByRole("link", { name: /Terms of use/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Privacy notice/ })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByText(/Àjọ · build/)).toBeInTheDocument();
  });

  it("falls back to Security for a section it doesn't know", async () => {
    query = new URLSearchParams("tab=nonsense");
    api();
    render(<SettingsScreen />);
    expect(await screen.findByRole("link", { name: /Authenticator app/ })).toBeInTheDocument();
  });

  describe("signing out of this device", () => {
    it("ends the session and goes to sign in", async () => {
      const fetchMock = api();
      render(<SettingsScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
      expect(posted(fetchMock)).toEqual(["/api/auth/sign-out"]);
    });
  });

  describe("signing out of every device", () => {
    it("asks first, saying what will happen, and does nothing until the person agrees", async () => {
      const fetchMock = api();
      render(<SettingsScreen />);
      const open = await screen.findByRole("button", { name: "Sign out of all devices" });
      expect(open).toHaveAttribute("aria-expanded", "false");
      await userEvent.click(open);

      expect(open).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText(/signs you out everywhere, including this device/i),
      ).toBeInTheDocument();
      expect(posted(fetchMock)).toEqual([]);

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("button", { name: "Sign out everywhere" })).toBeNull();
      expect(posted(fetchMock)).toEqual([]);
    });

    it("brings the question into view when it opens, since on a phone it appears below the screen", async () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      api();
      render(<SettingsScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(
        screen.getByText(/signs you out everywhere/i).closest("div"),
      );
    });

    it("ends every session once confirmed, then goes to sign in", async () => {
      const fetchMock = api();
      render(<SettingsScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
      expect(posted(fetchMock)).toEqual(["/api/auth/sign-out-all"]);
    });

    it("says so, and keeps the person here, when the other devices could not be signed out", async () => {
      api({
        "/api/auth/sign-out-all": () =>
          Response.json({ message: "We couldn't reach Àjọ." }, { status: 502 }),
      });
      render(<SettingsScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/still signed in here/i);
      expect(replace).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeEnabled();
    });

    it("sends the person to sign in if their session had already ended", async () => {
      api({ "/api/auth/sign-out-all": () => Response.json({}, { status: 401 }) });
      render(<SettingsScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    });
  });
});
