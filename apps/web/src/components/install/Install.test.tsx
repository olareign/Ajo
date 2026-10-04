import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetInstallForTests, startInstallCapture } from "@/lib/install";
import { InstallCard } from "./InstallCard";
import { InstallRow } from "./InstallRow";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";

function setUserAgent(value: string) {
  Object.defineProperty(navigator, "userAgent", { value, configurable: true });
}
function offerFromBrowser(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}
function runningAsApp(yes: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: yes && query.includes("standalone"),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  resetInstallForTests();
  startInstallCapture();
  localStorage.clear();
  runningAsApp(false);
  setUserAgent(ANDROID);
});
afterEach(() => vi.unstubAllGlobals());

describe("the install card on Today", () => {
  it("offers the browser's own install dialog, and goes away once it is accepted", async () => {
    const user = userEvent.setup();
    render(<InstallCard />);
    const event = offerFromBrowser("accepted");
    await user.click(await screen.findByRole("button", { name: "Install" }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Install" })).not.toBeInTheDocument();
  });

  it("shows the icon people will get, so they know what to look for", async () => {
    render(<InstallCard />);
    offerFromBrowser();
    expect(await screen.findByRole("img", { name: "The Àjọ app icon" })).toHaveAttribute(
      "src",
      "/icons/icon-192.png",
    );
  });

  it("shows the Share-sheet steps on an iPhone, which has no install dialog", async () => {
    setUserAgent(IPHONE);
    const user = userEvent.setup();
    render(<InstallCard />);
    await user.click(await screen.findByRole("button", { name: "Show me how" }));
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it("still shows when the browser has held its offer back, with the menu steps instead", async () => {
    const user = userEvent.setup();
    render(<InstallCard />);
    await user.click(await screen.findByRole("button", { name: "Show me how" }));
    expect(screen.getByText(/Install app or Add to Home screen/)).toBeInTheDocument();
  });

  it("stays away for a day after Not now, and is back after that", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<InstallCard />);
    await user.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region", { name: "Install Àjọ" })).not.toBeInTheDocument();
    unmount();

    render(<InstallCard />);
    expect(screen.queryByRole("region", { name: "Install Àjọ" })).not.toBeInTheDocument();
    unmount();

    localStorage.setItem("ajo.install.dismissedAt", String(Date.now() - 25 * 60 * 60 * 1000));
    render(<InstallCard />);
    expect(await screen.findByRole("region", { name: "Install Àjọ" })).toBeInTheDocument();
  });

  it("says nothing inside the installed app", () => {
    runningAsApp(true);
    render(<InstallCard />);
    expect(screen.queryByRole("region", { name: "Install Àjọ" })).not.toBeInTheDocument();
  });
});

describe("the install row on Me", () => {
  it("is always there to try, even after Not now on Today", async () => {
    localStorage.setItem("ajo.install.dismissedAt", String(Date.now()));
    render(<InstallRow />);
    expect(await screen.findByRole("button", { name: /Install Àjọ/ })).toBeInTheDocument();
  });

  it("starts the browser's dialog when it has one", async () => {
    const user = userEvent.setup();
    render(<InstallRow />);
    const event = offerFromBrowser();
    await user.click(await screen.findByRole("button", { name: /Install Àjọ/ }));
    expect(event.prompt).toHaveBeenCalled();
  });

  it("explains how otherwise", async () => {
    const user = userEvent.setup();
    render(<InstallRow />);
    await user.click(await screen.findByRole("button", { name: /Install Àjọ/ }));
    expect(screen.getByText(/Install app or Add to Home screen/)).toBeInTheDocument();
  });

  it("is hidden inside the installed app", () => {
    runningAsApp(true);
    render(<InstallRow />);
    expect(screen.queryByRole("button", { name: /Install Àjọ/ })).not.toBeInTheDocument();
  });
});
