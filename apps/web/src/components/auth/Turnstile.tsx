"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Options = {
  sitekey: string;
  appearance: "interaction-only";
  theme: "light";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};
type Api = {
  render(element: HTMLElement, options: Options): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

/**
 * Cloudflare's script, added to the page by our own (nonce-trusted) code, so the content security
 * policy needs no host allowance for scripts. One tag however many forms ask for it.
 */
function whenLoaded(ready: (api: Api) => void, failed: () => void): void {
  if (window.turnstile) return ready(window.turnstile);
  let script = document.head.querySelector<HTMLScriptElement>("script[data-turnstile]");
  if (!script) {
    script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "";
    document.head.appendChild(script);
  }
  const tag = script;
  tag.addEventListener("load", () => (window.turnstile ? ready(window.turnstile) : failed()), {
    once: true,
  });
  tag.addEventListener(
    "error",
    () => {
      tag.remove(); // so the next try starts again instead of waiting on a dead tag
      failed();
    },
    { once: true },
  );
}

type Props = Readonly<{
  siteKey: string;
  /** The token when the check passes; null when it expires, fails or is reset. */
  onToken: (token: string | null) => void;
  /** The check cannot run: the script could not load, or Cloudflare reported an error. */
  onUnavailable?: () => void;
  /** Change it to start a new check: a token works once. */
  resetKey?: number;
}>;

/** Cloudflare Turnstile. It stays out of sight unless Cloudflare needs the person to do something. */
export function Turnstile({ siteKey, onToken, onUnavailable, resetKey = 0 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string>(undefined);
  const callbacks = useRef({ onToken, onUnavailable });
  const firstReset = useRef(true);

  useEffect(() => {
    callbacks.current = { onToken, onUnavailable };
  });

  useEffect(() => {
    let live = true;
    whenLoaded(
      (api) => {
        if (!live || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: siteKey,
          appearance: "interaction-only",
          theme: "light",
          callback: (token) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(null),
          // Cloudflare gave up (for example, it does not allow this domain): say so, never wait for ever.
          "error-callback": () => {
            callbacks.current.onToken(null);
            callbacks.current.onUnavailable?.();
          },
        });
      },
      () => {
        if (live) callbacks.current.onUnavailable?.();
      },
    );
    return () => {
      live = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey]);

  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    if (widget.current) window.turnstile?.reset(widget.current);
    callbacks.current.onToken(null);
  }, [resetKey]);

  return <div ref={box} />;
}
