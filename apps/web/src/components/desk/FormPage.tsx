import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PAGE } from "@/lib/page";

/**
 * A form page: one task, nothing beside it. A phone gets the form alone. From a tablet up the form
 * keeps a width that is easy to fill in and stays on the left; a `wide` page (the wallet's, which
 * has its own menu beside it) uses all the room it is given.
 */
export function FormPage({ wide, children }: Readonly<{ wide?: boolean; children: ReactNode }>) {
  return (
    <main className={PAGE}>
      <FormColumns wide={wide}>{children}</FormColumns>
    </main>
  );
}

/** The form's column, for pages that draw their own frame (a step-by-step flow). */
export function FormColumns({
  wide,
  children,
  className,
}: Readonly<{ wide?: boolean; children: ReactNode; className?: string }>) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", !wide && "md:max-w-3xl", className)}>
      {children}
    </div>
  );
}
