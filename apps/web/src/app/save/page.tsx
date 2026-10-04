import type { Metadata } from "next";
import { SavingsHome } from "@/components/savings/SavingsHome";

export const metadata: Metadata = { title: "Savings" };

export default function Page() {
  return <SavingsHome />;
}
