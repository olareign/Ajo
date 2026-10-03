import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeScreen } from "./MeScreen";

const replace = vi.fn();
// Like Next's own router: one object for the life of the page.
const router = { replace, push: replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
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

describe("MeScreen", () => {
  it("shows who you are as a member card: handle, name and a confirmed email", async () => {
    api();
    render(<MeScreen />);
    const card = await screen.findByRole("region", { name: "Your membership" });
    expect(within(card).getByText("@ada_ola")).toBeInTheDocument();
    expect(within(card).getByText("Ada Ola")).toBeInTheDocument();
    expect(within(card).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(card).getByText("Confirmed")).toBeInTheDocument();
  });

  it("does not claim an email is confirmed when it is not", async () => {
    api({}, { ...me, emailVerified: false });
    render(<MeScreen />);
    const card = await screen.findByRole("region", { name: "Your membership" });
    expect(within(card).queryByText("Confirmed")).toBeNull();
  });

  it("says whether the authenticator app is on, without offering what is not built yet", async () => {
    api();
    const { unmount } = render(<MeScreen />);
    expect(await screen.findByText("Authenticator app")).toBeInTheDocument();
    expect(screen.getByText("Not set up")).toBeInTheDocument();
    unmount();

    api({}, { ...me, mfaEnabled: true });
    render(<MeScreen />);
    expect(await screen.findByText("On")).toBeInTheDocument();
  });

  it("leads back to Today", async () => {
    api();
    render(<MeScreen />);
    expect(await screen.findByRole("link", { name: "Back" })).toHaveAttribute("href", "/today");
  });

  describe("signing out of this device", () => {
    it("ends the session and goes to sign in", async () => {
      const fetchMock = api();
      render(<MeScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
      expect(posted(fetchMock)).toEqual(["/api/auth/sign-out"]);
    });
  });

  describe("signing out of every device", () => {
    it("asks first, saying what will happen, and does nothing until the person agrees", async () => {
      const fetchMock = api();
      render(<MeScreen />);
      const open = await screen.findByRole("button", { name: "Sign out of all devices" });
      expect(open).toHaveAttribute("aria-expanded", "false");
      await userEvent.click(open);

      expect(open).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText(/signs you out everywhere, including this phone/i),
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
      render(<MeScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(
        screen.getByText(/signs you out everywhere/i).closest("div"),
      );
    });

    it("ends every session once confirmed, then goes to sign in", async () => {
      const fetchMock = api();
      render(<MeScreen />);
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
      render(<MeScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/still signed in here/i);
      expect(replace).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeEnabled();
    });

    it("sends the person to sign in if their session had already ended", async () => {
      api({ "/api/auth/sign-out-all": () => Response.json({}, { status: 401 }) });
      render(<MeScreen />);
      await userEvent.click(await screen.findByRole("button", { name: "Sign out of all devices" }));
      await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    });
  });

  it("sends someone who has not finished setting up to setup, like every other signed-in screen", async () => {
    api({}, { ...me, onboarded: false });
    render(<MeScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });
});
