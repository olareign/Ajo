import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fetch } from "@/server/api-client";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

afterEach(() => vi.unstubAllGlobals());

describe("ForgotPasswordForm", () => {
  it("asks for the email and keeps the button off until there is one", async () => {
    render(<ForgotPasswordForm />);
    const send = screen.getByRole("button", { name: "Send me email" });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    expect(send).toBeEnabled();
  });

  it("sends the email to the BFF, then says to check the inbox without confirming an account exists", async () => {
    const fetchMock = vi.fn<Fetch>(async () => Response.json({ message: "ok" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), " ada@example.com ");
    await userEvent.click(screen.getByRole("button", { name: "Send me email" }));

    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      email: "ada@example.com",
    });
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/if ada@example.com has an account/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("shows the API's message when it refuses, for example after too many tries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetch>(async () =>
        Response.json({ message: "Too many requests. Try again later." }, { status: 429 }),
      ),
    );
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send me email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
