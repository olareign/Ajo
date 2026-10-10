import type { Metadata } from "next";
import { HelpCenter } from "@/components/help/HelpCenter";
import { HELP_TOPICS } from "@/components/help/help-topics";
import { PageIntro, PublicShell, band } from "@/components/public/PublicShell";
import { supportEmail } from "@/server/site-contact";

export const metadata: Metadata = {
  title: "Help",
  description: "Answers about circles, deposits, adding and withdrawing money, and your account.",
};

export default async function Page() {
  const email = await supportEmail();
  return (
    <PublicShell>
      <PageIntro kicker="Help" title="How can we help?">
        Most answers are here. If yours isn&apos;t, write to us and a person will reply.
      </PageIntro>
      <div className={`${band} pb-20`}>
        <HelpCenter topics={HELP_TOPICS} supportEmail={email} />
      </div>
    </PublicShell>
  );
}
