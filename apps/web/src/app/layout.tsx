import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { InstallCapture } from "@/components/install/InstallCapture";
import { THEME_SCRIPT } from "@/lib/theme-script";

// Every page gets a fresh CSP nonce (src/proxy.ts), which requires dynamic rendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Àjọ",
  description: "Save on your own, or in èsúsú groups with people you trust.",
  applicationName: "Àjọ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1410" },
  ],
  // Light or dark with the device, unless the person chose one on Me (see src/lib/theme.ts).
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // The theme script sets data-theme before React loads, so the attribute may differ from the server's.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run inline before the first paint (a file would load too late and flash the other
            theme). It is a fixed string from this codebase, never user data, and carries the CSP nonce. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <InstallCapture />
        {/* Mobile-first: phones get the full width, larger screens a phone-sized column. */}
        <div className="mx-auto min-h-dvh max-w-md bg-surface">{children}</div>
        <AppNav />
      </body>
    </html>
  );
}
