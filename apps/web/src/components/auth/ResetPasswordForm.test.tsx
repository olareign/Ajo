import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fetch } from "@/server/api-client";
import { ResetPasswordForm } from "./ResetPasswordForm";

afterEach(() => vi.unstubAllGlobals());
const TOKEN = "t".repeat(43);
const NEW = "Lagos-Mango-Drum-4721-Tide";

describe("ResetPasswordForm", () => {
  it("sets the new password with the link's token, then points to sign-in", async () => {
    const fetchMock = vi.fn<Fetch>(async () => Response.json({ message: "changed" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ResetPasswordForm token={TOKEN} />);
    await userEvent.type(screen.getByLabelText("New password"), NEW);
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/reset-password");
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      token: TOKEN,
      password: NEW,
    });
    expect(await screen.findByRole("heading", { name: "Password changed" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("asks for 12 characters before sending anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ResetPasswordForm token={TOKEN} />);
    await userEvent.type(screen.getByLabelText("New password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 12 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a refused password and keeps the form so the link is not wasted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetch>(async () =>
        Response.json(
          {
            message: "Password does not meet the requirements",
            details: { password: ["breached"] },
          },
          { status: 400 },
        ),
      ),
    );
    render(<ResetPasswordForm token={TOKEN} />);
    await userEvent.type(screen.getByLabelText("New password"), "password123456");
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("appeared in a data breach");
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("offers a new link when this one is invalid or has expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetch>(async () =>
        Response.json({ message: "This link is invalid or has expired." }, { status: 400 }),
      ),
    );
    render(<ResetPasswordForm token={TOKEN} />);
    await userEvent.type(screen.getByLabelText("New password"), NEW);
    await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("link", { name: "Ask for a new link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
