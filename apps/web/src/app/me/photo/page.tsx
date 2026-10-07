import type { Metadata } from "next";
import { PhotoScreen } from "@/components/me/PhotoScreen";

export const metadata: Metadata = { title: "Profile picture", robots: { index: false } };

export default function Page() {
  return <PhotoScreen />;
}
