import type { Metadata } from "next";
import { AddMoney } from "@/components/wallet/AddMoney";

export const metadata: Metadata = { title: "Add money", robots: { index: false } };

export default function Page() {
  return <AddMoney />;
}
