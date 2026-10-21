import { render, screen, waitFor, within } from "@testing-library/react";
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

  it.each([
    ["not_started", "Not started"],
    ["in_progress", "In progress"],
    ["pending", "Being checked"],
    ["approved", "Approved"],
    ["rejected", "Needs another try"],
  ] as const)("shows verification as %s and leads to the passport", async (kycStatus, word) => {
    api({}, { ...me, kycStatus });
    render(<MeScreen />);
    const row = (await screen.findByText("Identity check")).closest("div")!;
    expect(within(row).getByText(word)).toBeInTheDocument();
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/verify");
  });

  it("has no back arrow: it is a tab, and the bottom bar leads home", async () => {
    api();
    render(<MeScreen />);
    await screen.findByRole("heading", { name: "Me" });
    expect(screen.queryByRole("link", { name: "Back" })).toBeNull();
  });

  it("leads to Settings for everything that isn't the profile", async () => {
    api();
    render(<MeScreen />);
    expect(await screen.findByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("sends someone who has not finished setting up to setup, like every other signed-in screen", async () => {
    api({}, { ...me, onboarded: false });
    render(<MeScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });
});
