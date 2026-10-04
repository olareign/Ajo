"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { useInstall } from "@/lib/install";
import { InstallSteps } from "./InstallSteps";

/** On Me, always available until the app is installed: the way back when the card was dismissed. */
export function InstallRow() {
  const { kind, install } = useInstall();
  const [open, setOpen] = useState(false);

  if (kind === "installed" || kind === "unknown") return null;

  return (
    <section aria-labelledby="app" className="grid grid-cols-1 gap-3">
      <h2 id="app" className="font-display text-[22px] leading-7 font-semibold">
        The app
      </h2>
      <div className="grid grid-cols-1 gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift">
        <button
          type="button"
          aria-expanded={kind === "prompt" ? undefined : open}
          onClick={() => (kind === "prompt" ? void install() : setOpen((o) => !o))}
          className="flex items-center justify-between gap-4 text-left"
        >
          <span className="flex items-center gap-3 text-[15px] font-semibold">
            <Download aria-hidden className="size-5 text-primary" />
            Install Àjọ on this phone
          </span>
          <span className="text-[14px] font-medium text-ink-muted">
            {kind === "prompt" ? "Install" : open ? "Hide" : "How"}
          </span>
        </button>
        {open && <InstallSteps kind={kind} />}
      </div>
    </section>
  );
}
