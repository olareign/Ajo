import type { Metadata } from "next";
import { PublicHelpCenter } from "@/components/help/PublicHelpCenter";
import { supportEmail } from "@/server/site-contact";

export const metadata: Metadata = {
  title: "Help Center — Àjọ",
  description:
    "Find answers about Èsúsú rotating circles, security deposits, saving in naira and pounds, and contact our team.",
};

export default async function Page() {
  return <PublicHelpCenter supportEmail={await supportEmail()} />;
}
