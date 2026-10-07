import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushCard } from "./PushCard";

const push = vi.hoisted(() => ({
  loadPushStatus: vi.fn(),
  pushState: vi.fn(),
  turnOnPush: vi.fn(),
  turnOffPush: vi.fn(),
  sendTestPush: vi.fn(),
}));
vi.mock("@/lib/push-client", () => push);

const on = { ok: true, data: { enabled: true, publicKey: "KEY", devices: 0 } };
afterEach(() => Object.values(push).forEach((m) => m.mockReset()));

function setup(state: string, status: unknown = on) {
  push.loadPushStatus.mockResolvedValue(status);
  push.pushState.mockResolvedValue(state);
}

describe("push notifications for this phone", () => {
  it("offers to turn them on, and subscribes with the server's key", async () => {
    setup("off");
    push.turnOnPush.mockResolvedValue("on");
    const user = userEvent.setup();
    render(<PushCard />);
    await user.click(await screen.findByRole("button", { name: "Turn on notifications" }));
    expect(push.turnOnPush).toHaveBeenCalledWith("KEY");
    expect(await screen.findByText("On for this phone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a test" })).toBeInTheDocument();
  });

  it("sends a test, and turns off", async () => {
    setup("on");
    push.sendTestPush.mockResolvedValue({ ok: true, status: 204, data: {} });
    push.turnOffPush.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PushCard />);
    await user.click(await screen.findByRole("button", { name: "Send a test" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sent.");
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(
      await screen.findByRole("button", { name: "Turn on notifications" }),
    ).toBeInTheDocument();
    expect(push.turnOffPush).toHaveBeenCalledOnce();
  });

  it("explains what to do on an iPhone that has not got the app on its Home Screen", async () => {
    setup("install-first");
    render(<PushCard />);
    expect(await screen.findByText(/add Àjọ to your Home Screen first/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn on notifications" })).toBeNull();
  });

  it.each([
    ["blocked", /blocked for Àjọ/],
    ["unsupported", /can.t show notifications/],
  ])("says so when the browser is %s, with no button to press", async (state, words) => {
    setup(state);
    render(<PushCard />);
    expect(await screen.findByText(words)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says plainly when push is not switched on yet, and when it could not check", async () => {
    setup("off", { ok: true, data: { enabled: false, publicKey: null, devices: 0 } });
    const first = render(<PushCard />);
    expect(await screen.findByText(/aren.t switched on yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    first.unmount();
    setup("off", { ok: false, failure: { kind: "unreachable", message: "x" } });
    render(<PushCard />);
    expect(await screen.findByText(/couldn.t check this/)).toBeInTheDocument();
  });

  it("shows the server's words when it refuses, and leaves the person where they were", async () => {
    setup("off");
    push.turnOnPush.mockResolvedValue({
      error: {
        ok: false,
        status: 503,
        data: { message: "Push notifications aren't switched on yet." },
      },
    });
    const user = userEvent.setup();
    render(<PushCard />);
    await user.click(await screen.findByRole("button", { name: "Turn on notifications" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("aren't switched on yet"),
    );
    expect(screen.getByRole("button", { name: "Turn on notifications" })).toBeEnabled();
  });
});
