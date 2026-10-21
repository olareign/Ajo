import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsScreen } from "@/components/me/SettingsScreen";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  // The section shown comes from the address (?tab=), which is read on the client.
  return (
    <Suspense>
      <SettingsScreen />
    </Suspense>
  );
}
