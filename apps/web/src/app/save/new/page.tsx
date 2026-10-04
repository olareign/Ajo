import type { Metadata } from "next";
import { NewPlan } from "@/components/savings/NewPlan";

export const metadata: Metadata = { title: "Start a plan", robots: { index: false } };

export default function Page() {
  return <NewPlan />;
}
