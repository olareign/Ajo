import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Fetch } from "@/server/api-client";
import { CheckEmail, RESEND_WAIT_SECONDS } from "./CheckEmail";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));
const resendButton = () => screen.getByRole("button", { name: "Resend email" });

describe("CheckEmail", () => {
  it("says where the link went and how long it works", () => {
    render(<CheckEmail email="ada@example.com" />);
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/ada@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/24 hours/)).toBeInTheDocument();
  });

  it("explains why the person was sent here after trying to sign in", () => {
    render(<CheckEmail email="ada@example.com" from="sign-in" />);
    expect(screen.getByText(/confirm your email before you sign in/i)).toBeInTheDocument();
  });

  it("makes the person wait a minute before a resend, and says for how long", async () => {
    render(<CheckEmail email="ada@example.com" />);
    expect(resendButton()).toBeDisabled();
    expect(screen.getByText(`You can ask for another in ${RESEND_WAIT_SECONDS}s.`)).toBeVisible();

    advance(RESEND_WAIT_SECONDS - 1);
    expect(resendButton()).toBeDisabled();
    expect(screen.getByText("You can ask for another in 1s.")).toBeVisible();

    advance(1);
    expect(resendButton()).toBeEnabled();
    expect(screen.queryByText(/You can ask for another/)).toBeNull();
  });

  it("asks for a new link, confirms it, and starts the wait again", async () => {
    const fetchMock = vi.fn<Fetch>(async () => Response.json({ message: "ok" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckEmail email="ada@example.com" />);
    advance(RESEND_WAIT_SECONDS);

    await user.click(resendButton());

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/resend-verification");
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      email: "ada@example.com",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("We've sent a new link");
    expect(resendButton()).toBeDisabled();
  });

  it("shows why it failed, and lets the person try again once the wait is over", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<Fetch>(async () =>
        Response.json({ message: "Too many requests. Try again later." }, { status: 429 }),
      ),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckEmail email="ada@example.com" />);
    advance(RESEND_WAIT_SECONDS);

    await user.click(resendButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    expect(screen.queryByRole("status")).toBeNull();
    advance(RESEND_WAIT_SECONDS);
    expect(resendButton()).toBeEnabled();
  });

  it("blocks a double click while the request is in flight", async () => {
    let finish: (r: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckEmail email="ada@example.com" />);
    advance(RESEND_WAIT_SECONDS);

    await user.click(resendButton());
    const sending = screen.getByRole("button", { name: "Sending…" });
    expect(sending).toBeDisabled();
    await user.click(sending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => finish(Response.json({ message: "ok" }, { status: 202 })));
  });

  it("offers a way back to sign in, and to start over with another address", () => {
    render(<CheckEmail email="ada@example.com" />);
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("without an address there is nothing to resend to, only a way back", () => {
    render(<CheckEmail />);
    expect(screen.queryByRole("button", { name: "Resend email" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toBeInTheDocument();
  });
});
