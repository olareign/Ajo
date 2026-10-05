import type { Metadata } from "next";
import { PhoneScreen } from "@/components/me/PhoneScreen";

export const metadata: Metadata = { title: "Phone number", robots: { index: false } };

export default function Page() {
  return <PhoneScreen />;
}
