import type { Metadata } from "next";
import { PlanScreen } from "@/components/savings/PlanScreen";

export const metadata: Metadata = { title: "Your plan", robots: { index: false } };

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <PlanScreen id={id} />;
}
