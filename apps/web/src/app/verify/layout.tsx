import type { ReactNode } from "react";
import { KycFlow } from "@/components/kyc/KycFlow";

export default function VerifyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <KycFlow>{children}</KycFlow>;
}
