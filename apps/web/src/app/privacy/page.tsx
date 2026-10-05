import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { PRIVACY, PRIVACY_INTRO } from "@/components/legal/legal-texts";

export const metadata: Metadata = { title: "Privacy notice" };

export default function Page() {
  return <LegalDoc title="Privacy notice" intro={PRIVACY_INTRO} sections={PRIVACY} />;
}
