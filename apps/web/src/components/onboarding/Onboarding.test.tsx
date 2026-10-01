import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Onboarding } from "./Onboarding";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: replace }) }));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const click = (name: string | RegExp, role = "button") =>
  userEvent.click(screen.getByRole(role, { name }));
async function enter(digits: string) {
  for (const d of digits) await click(d);
}
async function toPinStep() {
  await click(/Nigeria/, "radio");
  await click("Continue");
  await click(/Both/, "radio");
  await click("Continue");
}

describe("Onboarding", () => {
  it("asks for the country first and will not move on without one", async () => {
    render(<Onboarding name="Ada" />);
    expect(screen.getByRole("heading", { name: /where do you live/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await click(/United Kingdom/, "radio");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("walks country, goal, PIN and confirmation, then saves and goes to Today", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Onboarding name="Ada" />);
    await toPinStep();
    expect(screen.getByRole("heading", { name: /choose a pin/i })).toBeInTheDocument();
    await enter("493817");
    await click("Continue");
    expect(screen.getByRole("heading", { name: /confirm your pin/i })).toBeInTheDocument();
    await enter("493817");
    await click("Finish");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/me/profile", "PUT"],
      ["/api/me/pin", "PUT"],
    ]);
    expect(JSON.parse(calls[0]![1].body as string)).toEqual({ country: "NG", goal: "both" });
    expect(JSON.parse(calls[1]![1].body as string)).toEqual({ pin: "493817" });
  });

  it("sends the person back to choose again when the two PINs differ, saving nothing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<Onboarding name="Ada" />);
    await toPinStep();
    await enter("493817");
    await click("Continue");
    await enter("493818");
    await click("Finish");
    expect(await screen.findByText(/didn't match/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /choose a pin/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API's reason when the PIN is too easy to guess", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me/pin"
          ? Response.json({ message: "Choose a PIN that isn't a repeat." }, { status: 400 })
          : new Response(null, { status: 204 }),
      ),
    );
    render(<Onboarding name="Ada" />);
    await toPinStep();
    await enter("123456");
    await click("Continue");
    await enter("123456");
    await click("Finish");
    expect(await screen.findByText(/isn't a repeat/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("lets the back button return to the previous step", async () => {
    render(<Onboarding name="Ada" />);
    await click(/Nigeria/, "radio");
    await click("Continue");
    await click("Back");
    expect(screen.getByRole("heading", { name: /where do you live/i })).toBeInTheDocument();
  });
});
