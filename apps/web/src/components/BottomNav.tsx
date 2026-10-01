import { CircleEllipsis, House, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/groups", label: "Groups", Icon: UsersRound },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/more", label: "More", Icon: CircleEllipsis },
] as const;

export function BottomNav({ current }: Readonly<{ current: string }>) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-line/50 bg-brand-50/80 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = current === href || current.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-16 flex-col items-center gap-1 px-3 py-3 text-[11px]",
                  active ? "text-brand-600" : "text-ink-muted",
                )}
              >
                <Icon aria-hidden className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
