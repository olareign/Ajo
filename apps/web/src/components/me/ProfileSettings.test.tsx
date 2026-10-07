import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forgetAll } from "@/lib/visit-cache";
import { CloseAccountScreen } from "./CloseAccountScreen";
import { EmailChoicesScreen } from "./EmailChoicesScreen";
import { MeScreen } from "./MeScreen";
import { PhoneScreen } from "./PhoneScreen";

const replace = vi.fn();
const push = vi.fn();
const router = { replace, push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  push.mockReset();
  forgetAll();
});

const me = (over: object = {}) => ({
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  country: "NG",
  mfaEnabled: false,
  kycStatus: "approved",
  kycTier: 1,
  phone: null,
  phoneVerified: false,
  trust: { level: "building", score: 25 },
  ...over,
});
type Route = (init?: RequestInit) => Response;
function api(routes: Record<string, Route>, profile: () => object = () => me()) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const route = routes[`${init?.method ?? "GET"} ${url}`];
    if (route) return route(init);
    if (url === "/api/me") return Response.json(profile());
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
const bodyOf = (mock: ReturnType<typeof api>, key: string) => {
  const call = mock.mock.calls.find(([url, init]) => `${init?.method ?? "GET"} ${url}` === key);
  return call?.[1]?.body ? JSON.parse(call[1].body as string) : undefined;
};
const none = () => new Response(null, { status: 204 });

describe("Me: tier, account rows and closing", () => {
  it("shows the level, what it unlocks, the trust standing, and a way to raise it", async () => {
    api({});
    render(<MeScreen />);
    const card = await screen.findByRole("region", { name: "Passport stamped" });
    expect(within(card).getByText("LEVEL 1 OF 2")).toBeInTheDocument();
    expect(within(card).getByText(/Add money, save, join circles/)).toBeInTheDocument();
    expect(within(card).getByText("Building trust")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /See your limits/ })).toHaveAttribute(
      "href",
      "/wallet/limits",
    );
    expect(within(card).getByRole("link", { name: /Raise your level/ })).toHaveAttribute(
      "href",
      "/verify",
    );
  });

  it("offers no raise at the top level, and says when a check is under way", async () => {
    api({}, () => me({ kycTier: 2 }));
    const { unmount } = render(<MeScreen />);
    const top = await screen.findByRole("region", { name: "BVN added" });
    expect(within(top).queryByRole("link", { name: /Raise/ })).toBeNull();
    unmount();
    forgetAll();

    api({}, () => me({ kycTier: 0, kycStatus: "pending" }));
    render(<MeScreen />);
    const waiting = await screen.findByRole("region", { name: "Not verified" });
    expect(within(waiting).getByText("Being checked")).toBeInTheDocument();
    expect(within(waiting).queryByRole("link", { name: /Raise/ })).toBeNull();
  });

  it("shows the phone number as not verified, or offers to add one", async () => {
    api({}, () => me({ phone: "+2348031234567" }));
    const { unmount } = render(<MeScreen />);
    const row = await screen.findByRole("link", { name: /Phone number/ });
    expect(row).toHaveAttribute("href", "/me/phone");
    expect(within(row).getByText("+2348031234567")).toBeInTheDocument();
    expect(within(row).getByText("Not verified")).toBeInTheDocument();
    unmount();
    forgetAll();

    api({});
    render(<MeScreen />);
    expect(
      within(await screen.findByRole("link", { name: /Phone number/ })).getByText("Add"),
    ).toBeInTheDocument();
  });

  it("leads to invites, email choices and closing the account", async () => {
    api({});
    render(<MeScreen />);
    expect(await screen.findByRole("link", { name: /Invite friends/ })).toHaveAttribute(
      "href",
      "/friends/invite",
    );
    expect(screen.getByRole("link", { name: /Notifications/ })).toHaveAttribute(
      "href",
      "/me/notifications",
    );
    expect(screen.getByRole("link", { name: "Close account" })).toHaveAttribute(
      "href",
      "/me/close",
    );
  });
});

it("leads to help, terms and privacy, and shows which build is running", async () => {
  api({});
  render(<MeScreen />);
  expect(await screen.findByRole("link", { name: /Help and support/ })).toHaveAttribute(
    "href",
    "/help",
  );
  expect(screen.getByRole("link", { name: /Terms of use/ })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: /Privacy notice/ })).toHaveAttribute("href", "/privacy");
  expect(screen.getByText(/Àjọ · build/)).toBeInTheDocument();
});

describe("the phone number screen", () => {
  it("saves the number and shows it the way it was stored, not verified", async () => {
    let stored: string | null = null;
    const mock = api(
      {
        "PUT /api/me/phone": () => {
          stored = "+2348031234567";
          return none();
        },
      },
      () => me({ phone: stored }),
    );
    const user = userEvent.setup();
    render(<PhoneScreen />);
    await user.type(await screen.findByLabelText("Phone number"), "0803 123 4567");
    await user.click(screen.getByRole("button", { name: "Save number" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Phone number saved.");
    expect(screen.getByText("+2348031234567")).toBeInTheDocument();
    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(bodyOf(mock, "PUT /api/me/phone")).toEqual({ phone: "0803 123 4567" });
  });

  it("says when another account has the number, and keeps letters out", async () => {
    api({
      "PUT /api/me/phone": () =>
        Response.json(
          { message: "Another account uses that number.", code: "phone_taken" },
          { status: 409 },
        ),
    });
    const user = userEvent.setup();
    render(<PhoneScreen />);
    const field = await screen.findByLabelText("Phone number");
    await user.type(field, "abc0803 123 4567");
    expect(field).toHaveValue("0803 123 4567");
    await user.click(screen.getByRole("button", { name: "Save number" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Another account uses that number.");
  });

  it("removes a saved number", async () => {
    api({ "DELETE /api/me/phone": none }, () => me({ phone: "+2348031234567" }));
    const user = userEvent.setup();
    render(<PhoneScreen />);
    await user.click(await screen.findByRole("button", { name: "Remove number" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Phone number removed.");
    expect(screen.queryByText("+2348031234567")).toBeNull();
  });
});

describe("email choices", () => {
  const all = { reminders: true, savings: true, circles: true, friends: true };

  it("saves a switch as it is flipped, sending only that choice", async () => {
    const mock = api({
      "GET /api/notifications/settings": () => Response.json(all),
      "PUT /api/notifications/settings": () => Response.json({ ...all, friends: false }),
    });
    const user = userEvent.setup();
    render(<EmailChoicesScreen />);
    const friends = await screen.findByRole("switch", { name: "Friends" });
    expect(friends).toBeChecked();
    await user.click(friends);
    expect(friends).not.toBeChecked();
    await waitFor(() =>
      expect(bodyOf(mock, "PUT /api/notifications/settings")).toEqual({ friends: false }),
    );
    expect(screen.getByText(/can.t be turned off/)).toBeInTheDocument();
  });

  it("puts the switch back when it couldn't be saved", async () => {
    api({
      "GET /api/notifications/settings": () => Response.json(all),
      "PUT /api/notifications/settings": () =>
        Response.json({ message: "Something went wrong." }, { status: 500 }),
    });
    const user = userEvent.setup();
    render(<EmailChoicesScreen />);
    const reminders = await screen.findByRole("switch", { name: "Reminders" });
    await user.click(reminders);
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(reminders).toBeChecked();
  });
});

describe("closing the account", () => {
  it("waits for the password, the code and an explicit yes, then shows the API's reason it can't", async () => {
    const mock = api(
      {
        "POST /api/me/security/close": () =>
          Response.json(
            {
              message:
                "Move all your money out first: your wallet, savings and deposits must be empty.",
              code: "close_blocked_money",
            },
            { status: 409 },
          ),
      },
      () => me({ mfaEnabled: true }),
    );
    const user = userEvent.setup();
    render(<CloseAccountScreen />);
    const go = await screen.findByRole("button", { name: "Close my account" });
    await user.type(screen.getByLabelText("Your password"), "my password");
    await user.type(screen.getByLabelText("Code from your authenticator app"), "123456");
    expect(go).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /closes for good/ }));
    await user.click(go);
    expect(await screen.findByRole("alert")).toHaveTextContent("Move all your money out first");
    expect(bodyOf(mock, "POST /api/me/security/close")).toEqual({
      password: "my password",
      code: "123456",
    });
  });

  it("signs this browser out once closed", async () => {
    const mock = api({
      "POST /api/me/security/close": none,
      "POST /api/auth/sign-out": none,
    });
    const user = userEvent.setup();
    render(<CloseAccountScreen />);
    await user.type(await screen.findByLabelText("Your password"), "my password");
    await user.click(screen.getByRole("checkbox", { name: /closes for good/ }));
    await user.click(screen.getByRole("button", { name: "Close my account" }));
    expect(
      await screen.findByRole("heading", { name: "Your account is closed" }),
    ).toBeInTheDocument();
    expect(bodyOf(mock, "POST /api/me/security/close")).toEqual({ password: "my password" });
    expect(mock.mock.calls.some(([url]) => url === "/api/auth/sign-out")).toBe(true);
  });
});
