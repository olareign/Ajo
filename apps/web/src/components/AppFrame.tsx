"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAppRoute, isAuthPage, isFullWidthRoute, isPublicPage } from "@/lib/app-routes";
import { cn } from "@/lib/cn";
import { useCompactSidebar } from "@/lib/sidebar";
import { useWide } from "@/lib/use-wide";
import { DesktopHeader } from "./DesktopHeader";

/**
 * The page's column. Phones get the full width. On a wide screen, pages inside the app sit to the
 * right of the sidebar and may use the room; everything else keeps a phone-sized column, except the
 * landing page and sign-in (which lay themselves out on a desk) and the public pages (which do at
 * every width).
 */
export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  const path = usePathname() ?? "";
  const app = isAppRoute(path);
  const full = isFullWidthRoute(path);
  const wide = useWide();
  const compact = useCompactSidebar();
  return (
    <div
      data-compact={compact || undefined}
      className={cn(
        "min-h-dvh bg-surface transition-[padding] duration-200 motion-reduce:transition-none",
        app && "md:pl-[248px] md:rail:pl-20",
      )}
    >
      {app && <DesktopHeader wide={wide} />}
      <div
        className={cn(
          "mx-auto min-h-dvh",
          isPublicPage(path) || isAuthPage(path) ? "max-w-none" : "max-w-md",
          // App pages may widen from a tablet up (Today does); each page keeps its own column.
          app && "md:max-w-none",
          full && "lg:max-w-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}
