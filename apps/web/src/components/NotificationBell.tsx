"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { NEW_NOTIFICATIONS } from "@/lib/unread";

/**
 * The bell: a link to Notifications with the unread count in gold. When new ones arrive while the
 * page is open it rings for a moment and screen readers hear how many came in (reduced motion: no
 * swing, the count and the words still change).
 */
export function NotificationBell({
  count,
  className,
}: Readonly<{ count: number; className: string }>) {
  const [arrived, setArrived] = useState(0);
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    let stop: ReturnType<typeof setTimeout> | undefined;
    const onNew = (event: Event) => {
      const added = (event as CustomEvent<number>).detail;
      setArrived(added);
      setRinging(true);
      clearTimeout(stop);
      stop = setTimeout(() => setRinging(false), 1600);
    };
    window.addEventListener(NEW_NOTIFICATIONS, onNew);
    return () => {
      window.removeEventListener(NEW_NOTIFICATIONS, onNew);
      clearTimeout(stop);
    };
  }, []);

  return (
    <>
      <Link
        href="/notifications"
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        className={className}
      >
        <Bell aria-hidden className={cn("size-5", ringing && "bell-ring")} />
        {count > 0 && (
          <span
            aria-hidden
            className={cn(
              "absolute -top-1 -right-1 grid min-w-[20px] place-items-center rounded-full border-2 border-surface bg-oro px-1 text-[11px] leading-4 font-bold text-on-oro",
              ringing && "pop",
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
      <span role="status" className="sr-only">
        {arrived > 0 ? `${arrived} new ${arrived === 1 ? "notification" : "notifications"}` : ""}
      </span>
    </>
  );
}
