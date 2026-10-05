import type { Metadata } from "next";
import { DiscoverCircles } from "@/components/circles/DiscoverCircles";

export const metadata: Metadata = { title: "Find a circle", robots: { index: false } };

export default function Page() {
  return <DiscoverCircles />;
}
