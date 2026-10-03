import { act, render } from "@testing-library/react";
import { Turnstile } from "./Turnstile";

type Options = {
  sitekey: string;
  appearance?: string;
  theme?: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

function stubTurnstile() {
  let options!: Options;
  const api = {
    render: vi.fn((_el: HTMLElement, o: Options) => {
      options = o;
      return "widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  (window as unknown as { turnstile: typeof api }).turnstile = api;
  return { api, options: () => options };
}
afterEach(() => {
  delete (window as unknown as { turnstile?: unknown }).turnstile;
  document.head.querySelectorAll("script[data-turnstile]").forEach((s) => s.remove());
});

describe("Turnstile", () => {
  it("draws Cloudflare's check with our site key, showing itself only when it has to", () => {
    const { api, options } = stubTurnstile();
    render(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(options()).toMatchObject({
      sitekey: "0xKEY",
      appearance: "interaction-only",
      theme: "light",
    });
  });

  it("hands the token up when the check passes, and takes it back when it expires or fails", () => {
    const { options } = stubTurnstile();
    const onToken = vi.fn();
    render(<Turnstile siteKey="0xKEY" onToken={onToken} />);

    act(() => options().callback("good-token"));
    expect(onToken).toHaveBeenLastCalledWith("good-token");
    act(() => options()["expired-callback"]());
    expect(onToken).toHaveBeenLastCalledWith(null);
    act(() => options().callback("another"));
    act(() => options()["error-callback"]());
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("says the check is unavailable when Cloudflare itself errors (for example, a domain it does not allow), but not when a token merely expires", () => {
    const { options } = stubTurnstile();
    const onUnavailable = vi.fn();
    render(<Turnstile siteKey="0xKEY" onToken={() => undefined} onUnavailable={onUnavailable} />);

    act(() => options()["expired-callback"]());
    expect(onUnavailable).not.toHaveBeenCalled();
    act(() => options()["error-callback"]());
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh check when told to, because a token works once", () => {
    const { api } = stubTurnstile();
    const { rerender } = render(
      <Turnstile siteKey="0xKEY" onToken={() => undefined} resetKey={0} />,
    );
    expect(api.reset).not.toHaveBeenCalled();
    rerender(<Turnstile siteKey="0xKEY" onToken={() => undefined} resetKey={1} />);
    expect(api.reset).toHaveBeenCalledWith("widget-1");
  });

  it("does not draw it twice when the parent re-renders", () => {
    const { api } = stubTurnstile();
    const { rerender } = render(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    rerender(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    expect(api.render).toHaveBeenCalledTimes(1);
  });

  it("removes the check when the form goes away", () => {
    const { api } = stubTurnstile();
    const { unmount } = render(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    unmount();
    expect(api.remove).toHaveBeenCalledWith("widget-1");
  });

  it("loads Cloudflare's script itself, once, when it is not on the page yet", () => {
    render(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    render(<Turnstile siteKey="0xKEY" onToken={() => undefined} />);
    const scripts = [
      ...document.head.querySelectorAll<HTMLScriptElement>("script[data-turnstile]"),
    ];
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
  });

  it("says so when Cloudflare's script cannot load", async () => {
    const onUnavailable = vi.fn();
    render(<Turnstile siteKey="0xKEY" onToken={() => undefined} onUnavailable={onUnavailable} />);
    const script = document.head.querySelector<HTMLScriptElement>("script[data-turnstile]")!;
    act(() => {
      script.dispatchEvent(new Event("error"));
    });
    expect(onUnavailable).toHaveBeenCalled();
  });
});
