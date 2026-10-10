"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/Logo";
import { ThemeModeToggle } from "./ThemeModeToggle";

const band = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety & Trust" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
];

export function LandingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md transition-colors">
      <div className={`${band} flex h-16 sm:h-18 items-center justify-between`}>
        <Link
          href="/"
          aria-label="Àjọ home"
          className="flex items-center gap-2"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Logo width={92} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Landing"
          className="hidden items-center gap-7 text-[15px] font-semibold lg:flex"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-colors",
                  isActive ? "text-primary font-bold" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeModeToggle />

          <div className="h-5 w-px bg-line" />

          <Link
            href="/sign-in"
            className="px-3 py-2 text-[15px] font-semibold text-ink-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex min-h-10 items-center justify-center rounded-m bg-primary px-4.5 text-[14px] font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-deep hover:shadow"
          >
            Sign up
          </Link>
        </div>

        {/* Mobile / Tablet Controls (< lg) */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeModeToggle />

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-raised text-ink transition-colors hover:bg-surface-sunken"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-line bg-surface-raised px-4 py-6 shadow-xl lg:hidden animate-fade-in">
          <nav className="flex flex-col space-y-2">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors",
                    isActive
                      ? "bg-primary-tint text-primary font-bold"
                      : "text-ink hover:bg-surface-sunken",
                  )}
                >
                  <span>{label}</span>
                  <ArrowRight className="size-4 opacity-50" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 w-full items-center justify-center rounded-m border border-line-strong px-6 text-base font-semibold text-ink hover:bg-surface-sunken transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-m bg-primary px-6 text-base font-semibold text-on-primary shadow-md hover:bg-primary-deep transition-colors"
            >
              Sign up
              <ArrowRight className="size-4.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
