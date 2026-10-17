"use client";

import { ChevronDown, HelpCircle, LogOut, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { postJson } from "@/components/auth/post-json";
import type { Me } from "@/components/onboarding/MeGate";
import { PersonPhoto } from "@/components/ui/PersonPhoto";

const ITEMS = [
  { href: "/me", label: "Your profile", Icon: User },
  { href: "/me/devices", label: "Devices and sign-ins", Icon: ShieldCheck },
  { href: "/me/help", label: "Help and support", Icon: HelpCircle },
] as const;

/**
 * Your picture, and behind it a short menu: profile, devices, help, sign out. A disclosure button
 * that opens a list of links: Escape or a click outside closes it (Escape returns focus to the
 * button); the arrow keys move through it.
 */
export function ProfileMenu({ me }: Readonly<{ me: Me | undefined }>) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("a,button")?.focus();
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false);
          button.current?.focus();
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const items = [...(menu.current?.querySelectorAll<HTMLElement>("a,button") ?? [])];
          const at = items.indexOf(document.activeElement as HTMLElement);
          const next = event.key === "ArrowDown" ? at + 1 : at - 1;
          items[(next + items.length) % items.length]?.focus();
          event.preventDefault();
        }
        return;
      }
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="relative ml-1 shrink-0">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Your account"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-surface-sunken"
      >
        <PersonPhoto
          username={me?.username}
          version={me?.photoVersion}
          name={me?.displayName ?? ""}
          size={40}
        />
        <ChevronDown aria-hidden className="size-4 text-ink-muted" />
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          className="absolute top-full right-0 z-40 mt-2 grid w-64 gap-1 rounded-[var(--radius-l)] border border-line bg-surface-raised p-2 shadow-lift"
        >
          {me && (
            <div className="grid border-b border-line px-3 pt-1 pb-3">
              <span className="truncate text-[15px] font-semibold">{me.displayName}</span>
              {me.username && (
                <span className="truncate text-[13px] text-ink-muted">@{me.username}</span>
              )}
            </div>
          )}
          {ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-m px-3 text-[14px] font-medium hover:bg-surface-sunken focus-visible:bg-surface-sunken"
            >
              <Icon aria-hidden className="size-[18px] text-ink-muted" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await postJson("/api/auth/sign-out", {});
              router.replace("/sign-in");
            }}
            className="flex min-h-11 items-center gap-3 rounded-m px-3 text-left text-[14px] font-medium text-danger hover:bg-danger-tint focus-visible:bg-danger-tint disabled:opacity-60"
          >
            <LogOut aria-hidden className="size-[18px]" />
            {leaving ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
