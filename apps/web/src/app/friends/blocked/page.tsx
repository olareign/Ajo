import type { Metadata } from "next";
import { BlockedScreen } from "@/components/friends/BlockedScreen";

export const metadata: Metadata = { title: "Blocked people", robots: { index: false } };

export default function Page() {
  return <BlockedScreen />;
}
