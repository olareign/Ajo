import type { Metadata } from "next";
import { StatementsScreen } from "@/components/reports/StatementsScreen";

export const metadata: Metadata = { title: "Statements", robots: { index: false } };

export default function Page() {
  return <StatementsScreen />;
}
