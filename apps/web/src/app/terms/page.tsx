import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { TERMS, TERMS_INTRO } from "@/components/legal/legal-texts";

export const metadata: Metadata = { title: "Terms of use" };

export default function Page() {
  return <LegalDoc title="Terms of use" intro={TERMS_INTRO} sections={TERMS} />;
}
