"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAppRoute, isFullWidthRoute } from "@/lib/app-routes";
import { cn } from "@/lib/cn";

/**
 * The page's column. Phones get the full width. On a wide screen, pages inside the app sit to the
 * right of the sidebar and may use the room; everything else keeps a phone-sized column, except the
 * landing page, which lays itself out.
 */
export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const path = usePathname() ?? "";
  const app = isAppRoute(path);
  const full = isFullWidthRoute(path);
  return (
    <div className={cn("min-h-dvh bg-surface", app && "lg:pl-[248px]")}>
      <div className={cn("mx-auto min-h-dvh max-w-md", (app || full) && "lg:max-w-none")}>
        {children}
      </div>
    </div>
  );
}
