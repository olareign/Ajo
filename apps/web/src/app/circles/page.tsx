import type { Metadata } from "next";
import { CirclesHome } from "@/components/circles/CirclesHome";

export const metadata: Metadata = { title: "Circles", robots: { index: false } };

export default function Page() {
  return <CirclesHome />;
}
