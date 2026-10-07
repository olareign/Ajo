import type { Metadata } from "next";
import { HelpScreen } from "@/components/legal/HelpScreen";

export const metadata: Metadata = { title: "Help" };

export default function Page() {
  return <HelpScreen />;
}
