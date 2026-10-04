import type { Metadata } from "next";
import { Limits } from "@/components/wallet/Limits";

export const metadata: Metadata = { title: "Your limits", robots: { index: false } };

export default function Page() {
  return <Limits />;
}
