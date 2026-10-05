import type { Metadata } from "next";
import { CloseAccountScreen } from "@/components/me/CloseAccountScreen";

export const metadata: Metadata = { title: "Close account", robots: { index: false } };

export default function Page() {
  return <CloseAccountScreen />;
}
