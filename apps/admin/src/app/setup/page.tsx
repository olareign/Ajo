import type { Metadata } from "next";
import { SetupScreen } from "@/components/screens/SetupScreen";

export const metadata: Metadata = { title: "Join the team" };

export default function Page() {
  return <SetupScreen />;
}
