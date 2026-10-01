import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "./SignUpForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
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
});
