import type { Metadata } from "next";
import { EmailChoicesScreen } from "@/components/me/EmailChoicesScreen";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default function Page() {
  return <EmailChoicesScreen />;
}
