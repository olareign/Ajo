import { render, screen, waitFor, within } from "@testing-library/react";
import * as React from "react";
import userEvent from "@testing-library/user-event";
import type { Failure } from "@/lib/admin-client";
import { ConsoleShell } from "./ConsoleShell";
import { ConfirmAction } from "./ui/ConfirmAction";
import { CaseScreen } from "./screens/CaseScreen";
import { KycPersonScreen } from "./screens/KycPersonScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PeopleScreen } from "./screens/PeopleScreen";
import { PersonScreen } from "./screens/PersonScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { TeamScreen } from "./screens/TeamScreen";

const replace = vi.fn();
const router = { replace, push: vi.fn() };
let path = "/";
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => path }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  path = "/";
});

type Route = (init?: RequestInit) => Response | Promise<Response>;
function api(routes: Record<string, Route>) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url.replace("/api/a/", "")}`;
    const route = routes[key];
    return route ? route(init) : Response.json({ message: `unexpected ${key}` }, { status: 500 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
const body = (mock: ReturnType<typeof api>, key: string) => {
  const call = mock.mock.calls.find(
    ([url, init]) => `${init?.method ?? "GET"} ${String(url).replace("/api/a/", "")}` === key,
  );
  return call?.[1]?.body ? JSON.parse(call[1].body as string) : undefined;
};
const me = (role: string, permissions: string[]) => ({
  id: "m1",
  email: "ada@ajo.test",
  name: "Ada Staff",
  role,
  permissions,
});
const signedInAs = (role: string, permissions: string[]) => ({
  "GET me": () => Response.json(me(role, permissions)),
});
const none = () => new Response(null, { status: 204 });
const ID = "3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b";

describe("the console frame", () => {
  it("shows each role only the places it can use", async () => {
    api({ ...signedInAs("support", ["overview:read", "users:read", "cases:read"]) });
    render(<ConsoleShell>x</ConsoleShell>);
    const nav = await screen.findByRole("navigation", { name: "Console" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Overview", "People", "Cases"]);
    expect(screen.queryByRole("link", { name: "Audit log" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Team" })).toBeNull();
  });

  it("shows an owner everything", async () => {
    api({
      ...signedInAs("owner", [
        "overview:read",
        "users:read",
        "kyc:read",
        "cases:read",
        "audit:read",
        "team:manage",
      ]),
    });
    render(<ConsoleShell>x</ConsoleShell>);
    const nav = await screen.findByRole("navigation", { name: "Console" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Overview", "People", "Identity", "Cases", "Audit log", "Team"]);
  });

  it("sends anyone without a session to the sign-in page, and draws nothing of the console", async () => {
    api({ "GET me": () => Response.json({ message: "Please sign in." }, { status: 401 }) });
    render(<ConsoleShell>secret page</ConsoleShell>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret page")).toBeNull();
  });

  it("signs out and goes to the sign-in page", async () => {
    const mock = api({ ...signedInAs("owner", ["overview:read"]), "POST auth/logout": none });
    const user = userEvent.setup();
    render(<ConsoleShell>x</ConsoleShell>);
    await screen.findByRole("navigation", { name: "Console" });
    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(
      mock.mock.calls.some(([u, i]) => u === "/api/a/auth/logout" && i?.method === "POST"),
    ).toBe(true);
  });
});

describe("signing in", () => {
  it("needs all three, sends them together and goes in", async () => {
    const mock = api({ "POST auth/login": () => Response.json({ admin: { id: "m1" } }) });
    const user = userEvent.setup();
    render(<LoginScreen />);
    const go = screen.getByRole("button", { name: "Sign in" });
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText("Email"), "ada@ajo.test");
    await user.type(screen.getByLabelText("Password"), "a long password here");
    await user.type(screen.getByLabelText("Authenticator code"), "12ab34 56");
    expect(screen.getByLabelText("Authenticator code")).toHaveValue("123456");
    await user.click(go);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(body(mock, "POST auth/login")).toEqual({
      email: "ada@ajo.test",
      password: "a long password here",
      code: "123456",
    });
  });

  it("shows the server's words and clears the code, and stays", async () => {
    api({
      "POST auth/login": () =>
        Response.json(
          { message: "Those details didn't work.", code: "admin_sign_in_failed" },
          { status: 401 },
        ),
    });
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(screen.getByLabelText("Email"), "ada@ajo.test");
    await user.type(screen.getByLabelText("Password"), "wrong password");
    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Those details didn't work.");
    expect(screen.getByLabelText("Authenticator code")).toHaveValue("");
    expect(replace).not.toHaveBeenCalled();
  });

  it("walks a new member through a password, then the authenticator app, then in", async () => {
    const mock = api({
      "POST auth/setup/start": () =>
        Response.json({
          secret: "JBSWY3DPEHPK3PXP",
          otpauthUri: "otpauth://totp/Ajo:ada?secret=JBSWY3DPEHPK3PXP",
        }),
      "POST auth/setup/confirm": () => Response.json({ admin: { id: "m1" } }),
    });
    const user = userEvent.setup();
    render(<SetupScreen />);
    await user.type(screen.getByLabelText("Email"), "ada@ajo.test");
    await user.type(screen.getByLabelText("Setup code"), "K7M2Q-9HRX4-BT3EA-WZ6PD");
    await user.type(screen.getByLabelText("Choose a password"), "harbour-lantern-quiet-orchard");
    await user.type(screen.getByLabelText("Password again"), "harbour-lantern-quiet");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("The two passwords are different.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password again"), "-orchard");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Code from the app"), "123456");
    await user.click(screen.getByRole("button", { name: "Finish and sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(body(mock, "POST auth/setup/start")).toEqual({
      email: "ada@ajo.test",
      setupCode: "K7M2Q-9HRX4-BT3EA-WZ6PD",
      password: "harbour-lantern-quiet-orchard",
    });
    expect(body(mock, "POST auth/setup/confirm")).toEqual({
      email: "ada@ajo.test",
      setupCode: "K7M2Q-9HRX4-BT3EA-WZ6PD",
      code: "123456",
    });
  });
});

describe("a sensitive action", () => {
  const open = (
    onConfirm: (input: { code: string; reason: string }) => Promise<Failure | null> = vi.fn(
      async () => null,
    ),
    onClose = vi.fn(),
  ) => {
    render(
      <ConfirmAction
        title="Suspend this account"
        confirmLabel="Suspend"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    return { onConfirm, onClose };
  };

  it("sends nothing until there is a reason of some substance and a six-digit code", async () => {
    const { onConfirm } = open();
    const user = userEvent.setup();
    const go = screen.getByRole("button", { name: "Suspend" });
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason/), "no");
    await user.type(screen.getByLabelText(/Code from your authenticator/), "123456");
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason/), " longer reason");
    expect(go).toBeEnabled();
    await user.click(go);
    expect(onConfirm).toHaveBeenCalledWith({ code: "123456", reason: "no longer reason" });
  });

  it("closes when it worked, and stays open with the server's words and an empty code when it did not", async () => {
    const failing = vi.fn(async (): Promise<Failure | null> => ({
      status: 401,
      message: "Enter a fresh code from your authenticator app to do this.",
      code: "admin_code_required",
      signedOut: false,
    }));
    const { onClose } = open(failing);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Reason/), "A proper reason");
    await user.type(screen.getByLabelText(/Code from your authenticator/), "123456");
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a fresh code");
    expect(screen.getByLabelText(/Code from your authenticator/)).toHaveValue("");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not steal focus while typing in its own fields", async () => {
    function Host() {
      const [email, setEmail] = React.useState("");
      return (
        <ConfirmAction
          title="Add"
          confirmLabel="Add"
          reason={false}
          onConfirm={async () => null}
          onClose={() => undefined}
        >
          <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </ConfirmAction>
      );
    }
    const user = userEvent.setup();
    render(<Host />);
    expect(screen.getByLabelText("Email")).toHaveFocus();
    await user.type(screen.getByLabelText("Email"), "ada@ajo.test");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@ajo.test");
  });

  it("closes on Escape and on Cancel", async () => {
    const { onClose } = open();
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

const person = (over: object = {}) => ({
  id: ID,
  email: "tunde@example.com",
  emailVerified: true,
  displayName: "Tunde Bello",
  username: "tunde",
  country: "NG",
  goal: "both",
  phone: null,
  phoneVerified: false,
  status: "active",
  statusNote: null,
  createdAt: "2026-10-01T10:00:00Z",
  closedAt: null,
  kyc: { status: "approved", tier: 1, via: "waived", override: "approved" },
  balances: [{ currency: "NGN", kind: "available", amount: "2500000" }],
  activePlans: 1,
  activeCircles: 2,
  openCases: 0,
  activeSessions: 1,
  recentSecurity: [{ kind: "signed_in", at: "2026-10-05T10:00:00Z" }],
  ...over,
});
const asRole = (permissions: string[]) => ({
  "GET me": () => Response.json(me("support", permissions)),
});

/** Pages are drawn inside the shell, which supplies who is signed in. */
const inShell = (page: React.ReactNode) => <ConsoleShell>{page}</ConsoleShell>;

describe("looking at a person", () => {
  it("searches, lists, and links to the person", async () => {
    const mock = api({
      ...asRole(["overview:read", "users:read"]),
      "GET users/search?q=tunde": () =>
        Response.json([
          {
            id: ID,
            email: "tunde@example.com",
            displayName: "Tunde Bello",
            username: "tunde",
            country: "NG",
            status: "suspended",
            createdAt: "2026-10-01T10:00:00Z",
          },
        ]),
    });
    const user = userEvent.setup();
    render(inShell(<PeopleScreen />));
    await user.type(await screen.findByLabelText("Email or username"), "ab");
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    await user.type(screen.getByLabelText("Email or username"), "tunde".slice(2));
    await user.clear(screen.getByLabelText("Email or username"));
    await user.type(screen.getByLabelText("Email or username"), "tunde");
    await user.click(screen.getByRole("button", { name: "Search" }));
    const link = await screen.findByRole("link", { name: "Tunde Bello" });
    expect(link).toHaveAttribute("href", `/users/${ID}`);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(mock.mock.calls.some(([u]) => String(u).startsWith("/api/a/users/search?q=tunde"))).toBe(
      true,
    );
  });

  it("shows their standing and money, and suspends with a reason and a code", async () => {
    const mock = api({
      ...asRole(["overview:read", "users:read", "users:suspend"]),
      [`GET users/${ID}`]: () => Response.json(person()),
      [`POST users/${ID}/suspend`]: none,
    });
    const user = userEvent.setup();
    render(inShell(<PersonScreen id={ID} />));
    expect(await screen.findByRole("heading", { name: "Tunde Bello" })).toBeInTheDocument();
    expect(screen.getByText("₦25,000.00")).toBeInTheDocument();
    expect(screen.getByText("Approved by hand")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reinstate" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Reason/), "Reported stolen by family");
    await user.type(within(dialog).getByLabelText(/Code from your authenticator/), "654321");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(body(mock, `POST users/${ID}/suspend`)).toEqual({
      code: "654321",
      reason: "Reported stolen by family",
    });
  });

  it("offers no suspend to someone whose role cannot, and reinstate only for a suspended account", async () => {
    api({
      ...asRole(["overview:read", "users:read"]),
      [`GET users/${ID}`]: () =>
        Response.json(person({ status: "suspended", statusNote: "Stolen phone" })),
    });
    render(inShell(<PersonScreen id={ID} />));
    expect(await screen.findByText(/Stolen phone/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reinstate" })).toBeNull();
  });
});

describe("identity and cases", () => {
  it("decides a waiting step with a reason, and explains that no documents exist yet", async () => {
    const mock = api({
      ...asRole(["overview:read", "kyc:read", "kyc:decide"]),
      [`GET kyc/${ID}`]: () =>
        Response.json({
          id: ID,
          email: "t@x.co",
          displayName: "Tunde Bello",
          country: "NG",
          status: "pending",
          tier: 0,
          via: "checks",
          override: null,
          steps: [
            {
              step: "id",
              status: "pending",
              reason: null,
              reference: null,
              updatedAt: "2026-10-05T10:00:00Z",
            },
            {
              step: "selfie",
              status: "approved",
              reason: null,
              reference: null,
              updatedAt: "2026-10-05T10:00:00Z",
            },
            {
              step: "address",
              status: "not_started",
              reason: null,
              reference: null,
              updatedAt: null,
            },
          ],
          overrideHistory: [],
          documents: [],
        }),
      [`POST kyc/${ID}/steps/id`]: none,
    });
    const user = userEvent.setup();
    render(inShell(<KycPersonScreen id={ID} />));
    expect(await screen.findByText(/No documents are stored yet/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Reason/), "Photo is cut off");
    await user.type(within(dialog).getByLabelText(/Code from your authenticator/), "111222");
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(body(mock, `POST kyc/${ID}/steps/id`)).toEqual({
      code: "111222",
      reason: "Photo is cut off",
      decision: "rejected",
    });
  });

  it("records a case's outcome only with a choice, a reason and a code, and shows the notes by name", async () => {
    const mock = api({
      ...asRole(["overview:read", "cases:read", "cases:write"]),
      [`GET cases/${ID}`]: () =>
        Response.json({
          id: ID,
          status: "open",
          round: 2,
          currency: "NGN",
          amountOwed: "500000",
          coveredByDeposit: "200000",
          stillOwed: "300000",
          openedAt: "2026-10-03T10:00:00Z",
          resolvedAt: null,
          group: { id: "g", name: "Cousins" },
          member: { id: "u", name: "Tunde Bello", email: "t@x.co" },
          memberDetails: {
            username: "tunde",
            country: "NG",
            phone: null,
            accountStatus: "active",
            kycStatus: "approved",
            kycTier: 1,
            kycVia: "waived",
          },
          notes: [
            {
              id: "1",
              note: "Called, promised Friday.",
              at: "2026-10-04T10:00:00Z",
              by: "Fatima Finance",
            },
          ],
        }),
      [`POST cases/${ID}/close`]: none,
    });
    const user = userEvent.setup();
    render(inShell(<CaseScreen id={ID} />));
    expect(await screen.findByText("Called, promised Friday.")).toBeInTheDocument();
    expect(screen.getByText(/Fatima Finance/)).toBeInTheDocument();
    expect(screen.getByText("₦3,000.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record the outcome" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/Written off/));
    await user.type(within(dialog).getByLabelText(/Reason/), "Uncollectable after three calls");
    await user.type(within(dialog).getByLabelText(/Code from your authenticator/), "999000");
    await user.click(within(dialog).getByRole("button", { name: "Close the case" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(body(mock, `POST cases/${ID}/close`)).toEqual({
      code: "999000",
      reason: "Uncollectable after three calls",
      outcome: "written_off",
    });
  });
});

describe("the team", () => {
  it("adds someone, shows their setup code once, and it is gone after being passed on", async () => {
    const mock = api({
      ...signedInAs("owner", ["overview:read", "team:manage"]),
      "GET team": () =>
        Response.json([
          {
            id: "m1",
            email: "ada@ajo.test",
            name: "Ada Staff",
            role: "owner",
            status: "active",
            lastLoginAt: null,
            createdAt: "2026-10-01T10:00:00Z",
          },
        ]),
      "POST team": () =>
        Response.json({
          id: "n1",
          setupCode: "K7M2Q-9HRX4-BT3EA-WZ6PD",
          expiresAt: "2026-10-08T10:00:00Z",
        }),
    });
    const user = userEvent.setup();
    render(inShell(<TeamScreen />));
    await user.click(await screen.findByRole("button", { name: /Add someone/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Email"), "new@ajo.test");
    await user.type(within(dialog).getByLabelText("Name"), "New Person");
    await user.click(within(dialog).getByLabelText(/Compliance/));
    await user.type(within(dialog).getByLabelText(/Code from your authenticator/), "123123");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(await screen.findByText("K7M2Q-9HRX4-BT3EA-WZ6PD")).toBeInTheDocument();
    expect(body(mock, "POST team")).toEqual({
      email: "new@ajo.test",
      name: "New Person",
      role: "compliance",
      code: "123123",
    });
    await user.click(screen.getByRole("button", { name: /passed it on/ }));
    expect(screen.queryByText("K7M2Q-9HRX4-BT3EA-WZ6PD")).toBeNull();
  });

  it("offers no reset or turn-off against yourself", async () => {
    api({
      ...signedInAs("owner", ["overview:read", "team:manage"]),
      "GET team": () =>
        Response.json([
          {
            id: "m1",
            email: "ada@ajo.test",
            name: "Ada Staff",
            role: "owner",
            status: "active",
            lastLoginAt: null,
            createdAt: "2026-10-01T10:00:00Z",
          },
          {
            id: "m2",
            email: "ben@ajo.test",
            name: "Ben Support",
            role: "support",
            status: "active",
            lastLoginAt: null,
            createdAt: "2026-10-01T10:00:00Z",
          },
        ]),
    });
    render(inShell(<TeamScreen />));
    const rows = await screen.findAllByRole("row");
    const own = rows.find((r) => within(r).queryByText("Ada Staff"))!;
    const other = rows.find((r) => within(r).queryByText("Ben Support"))!;
    expect(within(own).queryByRole("button")).toBeNull();
    expect(
      within(other)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Reset", "Turn off"]);
  });
});

describe("an answer the console does not recognise", () => {
  it("shows a message on the setup page instead of crashing", async () => {
    api({ "POST auth/setup/start": () => Response.json({}) });
    const user = userEvent.setup();
    render(<SetupScreen />);
    await user.type(screen.getByLabelText("Email"), "ada@ajo.test");
    await user.type(screen.getByLabelText("Setup code"), "K7M2Q-9HRX4-BT3EA-WZ6PD");
    await user.type(screen.getByLabelText("Choose a password"), "harbour-lantern-quiet-orchard");
    await user.type(screen.getByLabelText("Password again"), "harbour-lantern-quiet-orchard");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("answer we didn't expect");
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
  });

  it("does not open the console on an answer that is not a real member", async () => {
    api({ "GET me": () => Response.json({}) });
    render(<ConsoleShell>secret page</ConsoleShell>);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("secret page")).toBeNull();
  });
});
