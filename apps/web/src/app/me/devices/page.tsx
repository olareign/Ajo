import type { Metadata } from "next";
import { DevicesScreen } from "@/components/security/DevicesScreen";

export const metadata: Metadata = { title: "Devices", robots: { index: false } };

export default function Page() {
  return <DevicesScreen />;
}
