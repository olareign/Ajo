import {
  installKind,
  isDismissedRecently,
  promptInstall,
  rememberDismissal,
  resetInstallForTests,
  startInstallCapture,
  currentInstallState,
} from "./install";

const DAY = 24 * 60 * 60 * 1000;

function fakePromptEvent(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

beforeEach(() => {
  resetInstallForTests();
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("catching the browser's install offer", () => {
  it("keeps the offer, and stops the browser's own small bar so ours can be shown when we choose", () => {
    startInstallCapture();
    const event = fakePromptEvent("accepted");
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(currentInstallState().canPrompt).toBe(true);
  });

  it("asks once, then forgets the offer (a browser allows each one a single use)", async () => {
    startInstallCapture();
    const event = fakePromptEvent("accepted");
    window.dispatchEvent(event);
    expect(await promptInstall()).toBe("accepted");
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(currentInstallState().canPrompt).toBe(false);
    expect(await promptInstall()).toBe("unavailable");
  });

  it("reports a refusal", async () => {
    startInstallCapture();
    window.dispatchEvent(fakePromptEvent("dismissed"));
    expect(await promptInstall()).toBe("dismissed");
  });

  it("knows the app is installed once the browser says so", () => {
    startInstallCapture();
    window.dispatchEvent(fakePromptEvent("accepted"));
    window.dispatchEvent(new Event("appinstalled"));
    expect(currentInstallState()).toMatchObject({ installed: true, canPrompt: false });
  });

  it("is safe to start twice", () => {
    startInstallCapture();
    startInstallCapture();
    window.dispatchEvent(fakePromptEvent("accepted"));
    expect(currentInstallState().canPrompt).toBe(true);
  });
});

describe("what kind of help to give", () => {
  const state = (over: object) => ({ canPrompt: false, installed: false, ...over });
  it("is nothing when already running as an app", () => {
    expect(installKind(state({ installed: true }), "iPhone")).toBe("installed");
  });
  it("uses the browser's own dialog when it offered one", () => {
    expect(installKind(state({ canPrompt: true }), "Android")).toBe("prompt");
  });
  it("shows the Share-sheet steps on iPhone and iPad, which never offer a dialog", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
    expect(installKind(state({}), iphone)).toBe("ios");
    expect(installKind(state({}), "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)")).toBe("ios");
  });
  it("falls back to the browser-menu steps everywhere else", () => {
    expect(installKind(state({}), "Mozilla/5.0 (Linux; Android 14) Chrome/126")).toBe("manual");
  });
});

describe("not nagging, but coming back", () => {
  it("is not dismissed until someone says so", () => {
    expect(isDismissedRecently(Date.now())).toBe(false);
  });
  it("stays quiet for a day after Not now, then returns", () => {
    const now = Date.now();
    rememberDismissal(now);
    expect(isDismissedRecently(now + DAY - 1000)).toBe(true);
    expect(isDismissedRecently(now + DAY + 1000)).toBe(false);
  });
  it("works when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => rememberDismissal(Date.now())).not.toThrow();
    expect(isDismissedRecently(Date.now())).toBe(false);
  });
});
