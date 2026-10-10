"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";

/**
 * High-fidelity Light / Dark mode toggle designed for the desktop landing header.
 * Provides instant theme switching with accessible labeling and tactile visual feedback.
 */
export function ThemeModeToggle({ className }: Readonly<{ className?: string }>) {
  const [theme, setTheme] = useTheme();
  // False while the server renders (it can't know the device's theme), true once in the browser.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // During SSR, render a stable placeholder to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={cn(
          "flex h-9 w-[76px] items-center rounded-full border border-line bg-surface-sunken p-1",
          className,
        )}
        aria-hidden
      >
        <span className="size-7 rounded-full bg-surface-raised" />
      </div>
    );
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <div
      role="group"
      aria-label="Color mode switcher"
      className={cn(
        "flex items-center rounded-full border border-line bg-surface-sunken/80 p-0.5 backdrop-blur-sm transition-colors",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={
          isDark
            ? "Dark mode active. Click to switch to light mode"
            : "Light mode active. Click to switch to dark mode"
        }
        onClick={toggle}
        className="group relative flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-all hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-all duration-200",
            !isDark
              ? "bg-surface-raised text-oro shadow-sm"
              : "text-ink-muted group-hover:text-ink",
          )}
        >
          <Sun className="size-3.5" />
        </span>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-all duration-200",
            isDark
              ? "bg-surface-raised text-primary shadow-sm"
              : "text-ink-muted group-hover:text-ink",
          )}
        >
          <Moon className="size-3.5" />
        </span>
        <span className="sr-only">Toggle theme</span>
      </button>
    </div>
  );
}
