import type { Metadata } from "next";
import { CasesScreen } from "@/components/screens/CasesScreen";

export const metadata: Metadata = { title: "Cases" };

export default function Page() {
  return <CasesScreen />;
}
