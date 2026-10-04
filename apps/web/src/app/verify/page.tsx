import type { Metadata } from "next";
import { KycHub } from "@/components/kyc/KycHub";

export const metadata: Metadata = { title: "Your passport", robots: { index: false } };

export default function VerifyPage() {
  return <KycHub />;
}
