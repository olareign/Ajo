import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "./SignUpForm";

type Widget = { callback: (token: string) => void };
/** A stand-in for Cloudflare's script, so the form can be tested with and without the check. */
function stubTurnstile() {
  const state: { widget?: Widget } = {};
  const api = {
    render: vi.fn((_el: HTMLElement, o: Widget) => {
      state.widget = o;
      return "w1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  (window as unknown as { turnstile: typeof api }).turnstile = api;
  return { api, state };
}

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  delete (window as unknown as { turnstile?: unknown }).turnstile;
  document.head.querySelectorAll("script[data-turnstile]").forEach((el) => el.remove());
  vi.unstubAllGlobals();
  push.mockReset();
});

async function fill(email: string, password: string, name = "Ada") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  it("posts to the BFF and moves on to check-email", async () => {
    const fetchMock = vi.fn(async () => Response.json({ message: "ok" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SignUpForm />);
    await fill("ada@example.com", "correct horse battery");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/check-email?e=ada%40example.com"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-up",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      email: "ada@example.com",
      password: "correct horse battery",
      displayName: "Ada",
    });
  });

  it("asks what to call the person and will not send without a name", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SignUpForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    await user.type(screen.getByLabelText("Your name"), "   ");
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a plain message when the API lists validation problems", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: ["email must be an email"] }, { status: 400 })),
    );
    render(<SignUpForm />);
    await fill("not-an-email", "correct horse battery");
    expect(await screen.findByRole("alert")).toHaveTextContent("Check what you entered");
  });

  it("shows the API's message next to the form and stays put", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "That password has appeared in a data breach." }, { status: 422 }),
      ),
    );
    render(<SignUpForm />);
    await fill("ada@example.com", "password1234567");
    expect(await screen.findByRole("alert")).toHaveTextContent("appeared in a data breach");
    expect(push).not.toHaveBeenCalled();
  });

  it("tells the person when we couldn't connect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    render(<SignUpForm />);
    await fill("ada@example.com", "correct horse battery");
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach");
  });

  it("asks for at least 12 characters before sending anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SignUpForm />);
    await fill("ada@example.com", "short");
    expect(await screen.findByRole("alert")).toHaveTextContent("12 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an example in every field, so people know what goes where", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText("Your name")).toHaveAttribute("placeholder", "e.g. Adébáyọ̀ Ola");
    expect(screen.getByLabelText("Email")).toHaveAttribute("placeholder", "name@example.com");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "placeholder",
      "At least 12 characters",
    );
  });

  describe("with the bot check turned on", () => {
    it("shows no check, and sends no token, when no site key is set", async () => {
      const { api } = stubTurnstile();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({}, { status: 202 })),
      );
      render(<SignUpForm />);
      await fill("ada@example.com", "correct horse battery");
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(api.render).not.toHaveBeenCalled();
      const body = JSON.parse(
        (vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
      );
      expect(body).not.toHaveProperty("botToken");
    });

    it("keeps the button off until the person has passed the check", async () => {
      const { state } = stubTurnstile();
      render(<SignUpForm turnstileSiteKey="0xKEY" />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Your name"), "Ada");
      await user.type(screen.getByLabelText("Email"), "ada@example.com");
      await user.type(screen.getByLabelText("Password"), "correct horse battery");
      expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();

      act(() => state.widget!.callback("good-token"));
      expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
    });

    it("sends the token with the sign-up", async () => {
      const { state } = stubTurnstile();
      const fetchMock = vi.fn(async () => Response.json({}, { status: 202 }));
      vi.stubGlobal("fetch", fetchMock);
      render(<SignUpForm turnstileSiteKey="0xKEY" />);
      act(() => state.widget!.callback("good-token"));
      await fill("ada@example.com", "correct horse battery");
      await waitFor(() => expect(push).toHaveBeenCalled());
      const body = JSON.parse(
        (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
      );
      expect(body.botToken).toBe("good-token");
    });

    it("says so, and keeps the button off, when Cloudflare's script cannot load", async () => {
      render(<SignUpForm turnstileSiteKey="0xKEY" />);
      const script = document.head.querySelector<HTMLScriptElement>("script[data-turnstile]")!;
      act(() => {
        script.dispatchEvent(new Event("error"));
      });
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /couldn't load the security check/i,
      );
      expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    });

    it("asks for a fresh check after a refusal, since a token works once, and shows the reason", async () => {
      const { api, state } = stubTurnstile();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json(
            { message: "Please complete the check and try again.", code: "bot_check_failed" },
            { status: 400 },
          ),
        ),
      );
      render(<SignUpForm turnstileSiteKey="0xKEY" />);
      act(() => state.widget!.callback("used-token"));
      await fill("ada@example.com", "correct horse battery");

      expect(await screen.findByText("Please complete the check and try again.")).toBeVisible();
      expect(api.reset).toHaveBeenCalledWith("w1");
      expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    });
  });
});
