import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyEmail } from "./VerifyEmail";

afterEach(() => vi.unstubAllGlobals());

describe("VerifyEmail", () => {
  it("confirms only when the person presses the button, then offers sign-in", async () => {
    const fetchMock = vi.fn(async () => Response.json({ message: "Email confirmed." }));
    vi.stubGlobal("fetch", fetchMock);
    render(<VerifyEmail token={"t".repeat(43)} />);
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm my email" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("explains an invalid link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "This link is invalid or has expired." }, { status: 400 }),
      ),
    );
    render(<VerifyEmail token="bad" />);
    await userEvent.click(screen.getByRole("button", { name: "Confirm my email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });
});
