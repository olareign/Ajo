import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "./SignInForm";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  refresh.mockReset();
});

async function submit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("goes to Today after a plain sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ signedIn: true })),
    );
    render(<SignInForm />);
    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
  });

  it("goes to the code step when a second factor is needed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ mfaRequired: true })),
    );
    render(<SignInForm />);
    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in/verify"));
  });

  it("shows a generic message for bad credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Email or password is incorrect." }, { status: 401 }),
      ),
    );
    render(<SignInForm />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });

  it("tells the person to wait while a slow server wakes up, and blocks double sends", async () => {
    let finish: (r: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    render(<SignInForm />);
    await submit();
    const busy = await screen.findByRole("button", { name: "One moment…" });
    expect(busy).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(Response.json({ signedIn: true }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/today"));
  });
});
