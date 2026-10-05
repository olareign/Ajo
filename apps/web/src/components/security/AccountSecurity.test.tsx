import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityScreen } from "./ActivityScreen";
import { DevicesScreen } from "./DevicesScreen";
import { PasswordScreen } from "./PasswordScreen";
import { PinScreen } from "./PinScreen";
import { SecurityScreen } from "./SecurityScreen";

const replace = vi.fn();
const push = vi.fn();
const router = { replace, push };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  push.mockReset();
});

const me = (over: object = {}) => ({
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  mfaEnabled: true,
  ...over,
});
type Route = (init?: RequestInit) => Response;
function api(routes: Record<string, Route>, profile = me()) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/me") return Response.json(profile);
    const route = routes[`${init?.method ?? "GET"} ${url}`];
    return route ? route(init) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
const bodyOf = (mock: ReturnType<typeof api>, key: string) => {
  const call = mock.mock.calls.find(([url, init]) => `${init?.method ?? "GET"} ${url}` === key);
  return call?.[1]?.body ? JSON.parse(call[1].body as string) : undefined;
};
const none = () => new Response(null, { status: 204 });

describe("changing the password", () => {
  it("asks for the current password and the authenticator code, then says other devices were signed out", async () => {
    const mock = api({ "POST /api/me/security/password": none });
    const user = userEvent.setup();
    render(<PasswordScreen />);
    await user.type(await screen.findByLabelText("Current password"), "old password here");
    await user.type(screen.getByLabelText("New password"), "a brand new passphrase");
    const save = screen.getByRole("button", { name: "Change password" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Code from your authenticator app"), "123456");
    await user.click(save);
    expect(await screen.findByRole("status")).toHaveTextContent("Other devices were signed out");
    expect(bodyOf(mock, "POST /api/me/security/password")).toEqual({
      currentPassword: "old password here",
      newPassword: "a brand new passphrase",
      code: "123456",
    });
  });

  it("does not ask for a code when the authenticator is off, and shows the API's words for a weak password", async () => {
    api(
      {
        "POST /api/me/security/password": () =>
          Response.json(
            {
              message: "Password does not meet the requirements",
              details: { password: ["breached"] },
            },
            { status: 400 },
          ),
      },
      me({ mfaEnabled: false }),
    );
    const user = userEvent.setup();
    render(<PasswordScreen />);
    await user.type(await screen.findByLabelText("Current password"), "old password here");
    expect(screen.queryByLabelText("Code from your authenticator app")).toBeNull();
    await user.type(screen.getByLabelText("New password"), "password1234");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/data breach/);
  });
});

describe("the transaction PIN", () => {
  it("changes with the current PIN once the new one is typed twice the same", async () => {
    const mock = api({ "POST /api/me/security/pin": none });
    const user = userEvent.setup();
    render(<PinScreen />);
    await user.type(await screen.findByLabelText("Current PIN"), "493817");
    await user.type(screen.getByLabelText("New PIN"), "582914");
    await user.type(screen.getByLabelText("New PIN again"), "582915");
    expect(screen.getByText("The two PINs don't match.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set new PIN" })).toBeDisabled();
    await user.clear(screen.getByLabelText("New PIN again"));
    await user.type(screen.getByLabelText("New PIN again"), "582914");
    await user.click(screen.getByRole("button", { name: "Set new PIN" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your new PIN is set");
    expect(bodyOf(mock, "POST /api/me/security/pin")).toEqual({
      currentPin: "493817",
      newPin: "582914",
    });
  });

  it("resets a forgotten PIN with the password and a code", async () => {
    const mock = api({ "POST /api/me/security/pin/reset": none });
    const user = userEvent.setup();
    render(<PinScreen />);
    await user.click(await screen.findByRole("button", { name: "Forgot your PIN?" }));
    await user.type(screen.getByLabelText("Password"), "my password");
    await user.type(screen.getByLabelText("Code from your authenticator app"), "123456");
    await user.type(screen.getByLabelText("New PIN"), "582914");
    await user.type(screen.getByLabelText("New PIN again"), "582914");
    await user.click(screen.getByRole("button", { name: "Set new PIN" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your new PIN is set");
    expect(bodyOf(mock, "POST /api/me/security/pin/reset")).toEqual({
      password: "my password",
      code: "123456",
      newPin: "582914",
    });
  });

  it("leads to turning on the authenticator before a forgotten PIN can be reset", async () => {
    api({}, me({ mfaEnabled: false }));
    const user = userEvent.setup();
    render(<PinScreen />);
    await user.click(await screen.findByRole("button", { name: "Forgot your PIN?" }));
    expect(screen.getByRole("link", { name: "Turn on the authenticator app" })).toHaveAttribute(
      "href",
      "/me/security",
    );
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});

const ID = (n: number) => `3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5${n}`;
describe("devices", () => {
  it("marks this device, signs another out, and forgets a remembered one", async () => {
    const mock = api({
      "GET /api/me/security/sessions": () =>
        Response.json([
          {
            id: ID(1),
            device: "Chrome on Android",
            ip: "102.89.x.x",
            createdAt: "2026-10-01T09:00:00Z",
            lastSeenAt: "2026-10-05T09:00:00Z",
            current: true,
          },
          {
            id: ID(2),
            device: "Safari on iPhone",
            ip: null,
            createdAt: "2026-10-01T09:00:00Z",
            lastSeenAt: "2026-10-04T09:00:00Z",
            current: false,
          },
        ]),
      "GET /api/me/security/trusted-devices": () =>
        Response.json([
          {
            id: ID(3),
            device: "Chrome on Android",
            lastUsedAt: "2026-10-05T09:00:00Z",
            expiresAt: "2026-11-01T09:00:00Z",
          },
        ]),
      [`DELETE /api/me/security/sessions/${ID(2)}`]: none,
      [`DELETE /api/me/security/trusted-devices/${ID(3)}`]: none,
    });
    const user = userEvent.setup();
    render(<DevicesScreen />);
    const signedIn = await screen.findByRole("region", { name: "Signed in" });
    expect(within(signedIn).getByText("This device")).toBeInTheDocument();
    expect(within(signedIn).getAllByRole("button")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Sign out Safari on iPhone" }));
    await waitFor(() => expect(screen.queryByText("Safari on iPhone")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Forget Chrome on Android" }));
    expect(await screen.findByText(/None. Every new sign-in asks/)).toBeInTheDocument();
    expect(mock.mock.calls.some(([u, i]) => i?.method === "DELETE" && u.endsWith(ID(2)))).toBe(
      true,
    );
  });
});

describe("security activity", () => {
  it("lists what happened in words, newest first, with a way out", async () => {
    api({
      "GET /api/me/security/events": () =>
        Response.json([
          {
            kind: "password_changed",
            device: "Chrome on Android",
            ip: "102.89.x.x",
            at: "2026-10-05T09:00:00Z",
          },
          { kind: "new_device", device: "Safari on iPhone", ip: null, at: "2026-10-04T09:00:00Z" },
        ]),
    });
    render(<ActivityScreen />);
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Password changed");
    expect(items[0]).toHaveTextContent("Chrome on Android");
    expect(items[1]).toHaveTextContent("Signed in on a new device");
    expect(screen.getByRole("link", { name: /don.t recognise/ })).toHaveAttribute("href", "/me");
  });
});

describe("new recovery codes", () => {
  it("asks for the password and a code, then shows the new set once", async () => {
    const codes = Array.from({ length: 10 }, (_, i) => `abcd${i}-efgh${i}`);
    api({ "POST /api/me/security/recovery-codes": () => Response.json({ recoveryCodes: codes }) });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Get new recovery codes" }));
    const form = screen.getByRole("form", { name: "Get new recovery codes" });
    await user.type(within(form).getByLabelText("Password"), "my password");
    await user.type(within(form).getByLabelText("Code from your app"), "123456");
    await user.click(within(form).getByRole("button", { name: "Make new codes" }));
    expect(await screen.findByText(codes[0]!)).toBeInTheDocument();
    expect(screen.getByText(/old ones no longer work/)).toBeInTheDocument();
  });
});
