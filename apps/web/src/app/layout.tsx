import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Mobile-first: phones get the full width, larger screens a phone-sized column. */}
        <div className="mx-auto min-h-dvh max-w-md bg-surface">{children}</div>
      </body>
    </html>
  );
}
