import type { Metadata } from "next";
import { InsightsScreen } from "@/components/reports/InsightsScreen";

export const metadata: Metadata = { title: "Insights", robots: { index: false } };

export default function Page() {
  return <InsightsScreen />;
}
