import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fetch } from "@/server/api-client";
import { MfaForm } from "./MfaForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

async function enter(digits: string) {
  for (const d of digits) await userEvent.click(screen.getByRole("button", { name: d }));
}
const body = (fetchMock: { mock: { calls: unknown[][] } }) =>
  JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);

describe("MfaForm", () => {
  it("keeps Confirm off until all six digits are in, then signs in", async () => {
    const fetchMock = vi.fn<Fetch>(async () => Response.json({ signedIn: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MfaForm />);
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    await enter("12345");
    expect(confirm).toBeDisabled();
    await enter("6");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/mfa");
    expect(body(fetchMock)).toEqual({ code: "123456" });
  });

  it("shows the API's message and clears the boxes after a wrong code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "That code is incorrect." }, { status: 401 })),
    );
    const { container } = render(<MfaForm />);
    await enter("000000");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is incorrect.");
    expect(container.querySelectorAll("[data-box]")[0]).toHaveTextContent("");
    expect(push).not.toHaveBeenCalled();
  });

  it("lets the person use a recovery code instead", async () => {
    const fetchMock = vi.fn(async () => Response.json({ signedIn: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MfaForm />);
    await userEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
    await userEvent.type(screen.getByLabelText("Recovery code"), "abcde-fghjk");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
    expect(body(fetchMock)).toEqual({ recoveryCode: "abcde-fghjk" });
  });

  it("can go back to the authenticator code from the recovery code", async () => {
    render(<MfaForm />);
    await userEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
    await userEvent.click(screen.getByRole("button", { name: "Use my authenticator app" }));
    expect(screen.getByRole("group", { name: "Authenticator code" })).toBeInTheDocument();
  });

  it("offers a way back to sign in when the sign-in has expired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { message: "That sign-in took too long. Please start again." },
          { status: 401 },
        ),
      ),
    );
    render(<MfaForm />);
    await enter("123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("puts Confirm above the keypad, so it stays on screen on a small phone", () => {
    render(<MfaForm />);
    const confirm = screen.getByRole("button", { name: "Confirm" });
    const key = screen.getByRole("button", { name: "1" });
    expect(confirm.compareDocumentPosition(key) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
