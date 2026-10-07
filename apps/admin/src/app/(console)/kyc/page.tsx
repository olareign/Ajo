import type { Metadata } from "next";
import { KycQueueScreen } from "@/components/screens/KycQueueScreen";

export const metadata: Metadata = { title: "Identity" };

export default function Page() {
  return <KycQueueScreen />;
}
