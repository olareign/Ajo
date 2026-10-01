import "@fontsource-variable/montserrat";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Àjọ",
  description: "Save on your own, or in èsúsú groups with people you trust.",
  applicationName: "Àjọ",
};

export const viewport: Viewport = {
  themeColor: "#038641",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Mobile-first: phones get the full width, larger screens a phone-sized column. */}
        <main className="mx-auto min-h-dvh max-w-md bg-surface">{children}</main>
      </body>
    </html>
  );
}
