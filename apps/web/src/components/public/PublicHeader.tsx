"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { PUBLIC_LINKS } from "./links";
import { ThemeToggle } from "./ThemeToggle";

const band = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10";

/** The bar on every public page: the logo home, four pages, the theme, and the two ways in. */
export function PublicHeader() {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className={cn(band, "flex h-16 items-center gap-6")}>
        <Link href="/" aria-label="Àjọ home" className="shrink-0">
          <Logo width={78} />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:text-ink aria-[current=page]:bg-primary-tint aria-[current=page]:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="hidden rounded-full px-4 py-2 text-[15px] font-semibold text-ink hover:bg-surface-sunken sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="hidden rounded-full bg-primary px-4 py-2 text-[15px] font-semibold text-on-primary hover:bg-primary-deep sm:block"
          >
            Create account
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="public-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-surface-sunken lg:hidden"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="public-menu"
          aria-label="Main"
          className="border-t border-line bg-surface px-4 pt-2 pb-5 lg:hidden"
          // A link followed from the menu opens a new page; the menu shouldn't stay open over it.
          onClick={(e) => {
            if ((e.target as Element).closest("a")) setOpen(false);
          }}
        >
          <ul className="grid">
            {PUBLIC_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={path === href ? "page" : undefined}
                  className="block border-b border-line py-3.5 text-[17px] font-medium aria-[current=page]:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/sign-in"
              className="flex min-h-12 items-center justify-center rounded-m font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="flex min-h-12 items-center justify-center rounded-m bg-primary font-semibold text-on-primary"
            >
              Create account
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
