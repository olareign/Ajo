import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";

export default function ConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
