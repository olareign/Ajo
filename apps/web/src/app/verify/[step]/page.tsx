import type { Metadata } from "next";
import { StepScreen } from "@/components/kyc/StepScreen";

export const metadata: Metadata = { title: "Verify", robots: { index: false } };

export default async function StepPage({
  params,
}: Readonly<{ params: Promise<{ step: string }> }>) {
  const { step } = await params;
  return <StepScreen step={step} />;
}
