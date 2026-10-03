import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecurityScreen } from "./SecurityScreen";

const replace = vi.fn();
const router = { replace, push: replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const me = {
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  emailVerified: true,
  mfaEnabled: false,
};
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const CODES = Array.from({ length: 10 }, (_, i) => `abcd${i}-efgh${i}`);

type Route = (init?: RequestInit) => Response | Promise<Response>;
function api(routes: Record<string, Route> = {}, profile: object = me) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/me") return Response.json(profile);
    const key = `${init?.method ?? "GET"} ${url}`;
    return routes[key] ? routes[key](init) : new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const enrol: Route = () =>
  Response.json({ secret: SECRET, otpauthUri: `otpauth://totp/x?secret=${SECRET}` });
const bodyOf = (fetchMock: ReturnType<typeof api>, key: string) => {
  const call = (fetchMock.mock.calls as unknown as [string, RequestInit?][]).find(
    ([url, init]) => `${init?.method ?? "GET"} ${url}` === key,
  );
  return call?.[1]?.body ? JSON.parse(call[1].body as string) : undefined;
};

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  const pad = screen.getByRole("group", { name: "Number pad" });
  for (const digit of code) await user.click(within(pad).getByRole("button", { name: digit }));
}

describe("turning on the authenticator app", () => {
  it("opens with why it matters and what to do, and starts nothing until asked", async () => {
    const fetchMock = api();
    render(<SecurityScreen />);
    expect(await screen.findByRole("heading", { name: "Add a second lock" })).toBeInTheDocument();
    expect(screen.getByText(/before you can move money/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/me"]);
  });

  it("shows a QR code and the same key as text for when scanning is not possible", async () => {
    api({ "POST /api/auth/mfa/totp": enrol });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));

    expect(await screen.findByRole("img", { name: /QR code/i })).toBeInTheDocument();
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy key" })).toBeInTheDocument();
  });

  it("confirms with a code, then shows the ten recovery codes once and sends only the code", async () => {
    const fetchMock = api({
      "POST /api/auth/mfa/totp": enrol,
      "POST /api/auth/mfa/totp/confirm": () => Response.json({ recoveryCodes: CODES }),
    });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(await screen.findByRole("button", { name: "I've added it" }));
    await typeCode(user, "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByRole("heading", { name: "Keep your spare keys" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Recovery codes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(within(list).getByText("abcd0-efgh0")).toBeInTheDocument();
    expect(bodyOf(fetchMock, "POST /api/auth/mfa/totp/confirm")).toEqual({ code: "123456" });
  });

  it("will not finish until the person says they saved the recovery codes", async () => {
    api({
      "POST /api/auth/mfa/totp": enrol,
      "POST /api/auth/mfa/totp/confirm": () => Response.json({ recoveryCodes: CODES }),
    });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(await screen.findByRole("button", { name: "I've added it" }));
    await typeCode(user, "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await screen.findByRole("heading", { name: "Keep your spare keys" });

    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy all" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
      "download",
      "ajo-recovery-codes.txt",
    );
    await user.click(screen.getByRole("checkbox", { name: /I.ve saved these codes/i }));
    expect(done).toBeEnabled();
    await user.click(done);
    expect(replace).toHaveBeenCalledWith("/me");
  });

  it("says when the code is wrong, clears it, and stays on the same step", async () => {
    api({
      "POST /api/auth/mfa/totp": enrol,
      "POST /api/auth/mfa/totp/confirm": () =>
        Response.json({ message: "That code is incorrect." }, { status: 400 }),
    });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(await screen.findByRole("button", { name: "I've added it" }));
    await typeCode(user, "000000");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("That code is incorrect.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Keep your spare keys" })).not.toBeInTheDocument();
  });

  it("goes back to the QR code without asking the server for a new secret", async () => {
    const fetchMock = api({ "POST /api/auth/mfa/totp": enrol });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(await screen.findByRole("button", { name: "I've added it" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("img", { name: /QR code/i })).toBeInTheDocument();
    const enrols = fetchMock.mock.calls.filter(
      ([url, init]) => url === "/api/auth/mfa/totp" && init?.method === "POST",
    );
    expect(enrols).toHaveLength(1);
  });

  it("sends a signed-out person to sign in, and shows any other refusal", async () => {
    api({ "POST /api/auth/mfa/totp": () => new Response(null, { status: 401 }) });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("shows the reason when setup cannot start", async () => {
    api({
      "POST /api/auth/mfa/totp": () =>
        Response.json({ message: "The authenticator app is already turned on." }, { status: 409 }),
    });
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Start" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already turned on");
  });
});

describe("when the authenticator app is already on", () => {
  const on = { ...me, mfaEnabled: true };

  it("says so, and offers to turn it off instead of setting it up again", async () => {
    api({}, on);
    render(<SecurityScreen />);
    expect(
      await screen.findByRole("heading", { name: "Your second lock is on" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("needs the password and a code to turn it off", async () => {
    const fetchMock = api(
      { "DELETE /api/auth/mfa/totp": () => new Response(null, { status: 204 }) },
      on,
    );
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Turn off" }));
    const confirm = screen.getByRole("button", { name: "Turn off the second lock" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.type(screen.getByLabelText("Code from your app"), "123456");
    await user.click(confirm);

    expect(bodyOf(fetchMock, "DELETE /api/auth/mfa/totp")).toEqual({
      password: "correct horse battery staple",
      code: "123456",
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/me"));
  });

  it("shows a wrong password or code without signing the person out", async () => {
    api(
      {
        "DELETE /api/auth/mfa/totp": () =>
          Response.json(
            { message: "That password is incorrect.", code: "password_wrong" },
            { status: 401 },
          ),
      },
      on,
    );
    const user = userEvent.setup();
    render(<SecurityScreen />);
    await user.click(await screen.findByRole("button", { name: "Turn off" }));
    await user.type(screen.getByLabelText("Password"), "nope nope nope nope");
    await user.type(screen.getByLabelText("Code from your app"), "123456");
    await user.click(screen.getByRole("button", { name: "Turn off the second lock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That password is incorrect.");
    expect(replace).not.toHaveBeenCalled();
  });
});
