"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";

const DARK = "(prefers-color-scheme: dark)";

// Old browsers and test pages may lack matchMedia: then the device counts as light.
const deviceQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia(DARK) : null;

function subscribeDevice(onChange: () => void): () => void {
  const query = deviceQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/**
 * One button that flips the page between light and dark. It shows what you'll get, like a light
 * switch: a moon while the page is light. The server can't know the device's theme, so it draws a
 * blank button of the same size first and fills it in once the page is running.
 */
export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const [theme, setTheme] = useTheme();
  const deviceDark = useSyncExternalStore(
    subscribeDevice,
    () => deviceQuery()?.matches ?? false,
    () => null,
  );
  const base = cn(
    "grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
    className,
  );
  if (deviceDark === null) return <span aria-hidden className={base} />;

  const dark = theme === "dark" || (theme === "system" && deviceDark);
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={base}
    >
      {dark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  );
}
