"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Help, terms and privacy are open to everyone, signed in or not (a closed account's email links
 * here). Back returns to wherever the person came from, or to the welcome page on a fresh visit.
 */
export function InfoShell({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle?: string; children: ReactNode }>) {
  const router = useRouter();
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      />
      {children}
    </main>
  );
}
