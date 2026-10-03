import type { Metadata } from "next";
import { MeScreen } from "@/components/me/MeScreen";

export const metadata: Metadata = { title: "Me", robots: { index: false } };

export default function MePage() {
  return <MeScreen />;
}
