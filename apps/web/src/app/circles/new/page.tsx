import type { Metadata } from "next";
import { NewCircle } from "@/components/circles/NewCircle";

export const metadata: Metadata = { title: "Start a circle", robots: { index: false } };

export default function Page() {
  return <NewCircle />;
}
