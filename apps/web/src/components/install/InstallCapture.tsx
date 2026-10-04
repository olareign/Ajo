"use client";

import { startInstallCapture } from "@/lib/install";

// At module load, not in an effect: the browser fires its install offer once and early.
startInstallCapture();

/** Renders nothing; its job is to be in the page's script so the browser's install offer is caught. */
export function InstallCapture() {
  return null;
}
