"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { isDismissedRecently, rememberDismissal, useInstall } from "@/lib/install";
import { InstallSteps } from "./InstallSteps";

const noop = () => () => undefined;

/**
 * A card on Today offering to put Àjọ on the home screen. Not now hides it for a day, not for good:
 * a browser shows its own prompt rarely, so this is where the person gets another look.
 */
export function InstallCard() {
  const { kind, install } = useInstall();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  // Read once the page is in a browser; counted as quiet on the server so nothing flashes.
  const quiet = useSyncExternalStore(
    noop,
    () => isDismissedRecently(Date.now()),
    () => true,
  );

  if (hidden || quiet || kind === "installed" || kind === "unknown") return null;

  return (
    <section
      aria-label="Install Àjọ"
      className="mt-4 grid grid-cols-1 gap-4 rounded-[var(--radius-l)] bg-primary-tint p-4"
    >
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small fixed icon from /public */}
        <img
          src="/icons/icon-192.png"
          alt="The Àjọ app icon"
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-[14px] shadow-lift"
        />
        <span className="grid gap-0.5">
          <span className="text-[15px] font-semibold text-primary-deep">
            Put Àjọ on your home screen
          </span>
          <span className="text-[14px] leading-5 text-ink-muted">
            Opens like an app, no browser bar.
          </span>
        </span>
      </div>
      {open && <InstallSteps kind={kind} />}
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button
          variant="quiet"
          onClick={() => {
            rememberDismissal(Date.now());
            setHidden(true);
          }}
        >
          Not now
        </Button>
        {kind === "prompt" ? (
          <Button
            onClick={async () => {
              if ((await install()) === "accepted") setHidden(true);
            }}
          >
            Install
          </Button>
        ) : (
          <Button aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            Show me how
          </Button>
        )}
      </div>
    </section>
  );
}
