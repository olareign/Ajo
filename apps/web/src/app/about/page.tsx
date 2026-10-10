import type { Metadata } from "next";
import Link from "next/link";
import { FACTS } from "@/components/public/facts";
import { PageIntro, PublicShell, band } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "About",
  description: "Why Àjọ exists, what it does, and where things stand.",
};

const h2 = "font-display text-[26px] leading-tight font-bold tracking-[-0.02em] lg:text-[30px]";

export default function Page() {
  return (
    <PublicShell>
      <PageIntro kicker="About" title="An old way of saving, kept honest.">
        Long before banking apps, people saved in circles: a few friends, the same amount, one pot
        that went round. It still works. What breaks it is the notebook, the reminders, and the one
        member who doesn&apos;t pay.
      </PageIntro>

      <div className={`${band} grid gap-14 pb-24 lg:grid-cols-3`}>
        <section aria-labelledby="name" className="grid content-start gap-3">
          <h2 id="name" className={h2}>
            The name
          </h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            Àjọ is a Yoruba word for people who come together, and it&apos;s what many Nigerians
            call a savings circle. Others say èsúsú, adashe or susu. Same idea.
          </p>
        </section>
        <section aria-labelledby="what" className="grid content-start gap-3">
          <h2 id="what" className={h2}>
            What we do
          </h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            We collect everyone&apos;s share on the day, pay the pot to whoever&apos;s turn it is,
            hold deposits so one missed payment doesn&apos;t sink a round, and keep a record
            everyone can see. You can also save on your own.
          </p>
        </section>
        <section aria-labelledby="now" className="grid content-start gap-3">
          <h2 id="now" className={h2}>
            Where we are
          </h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            We&apos;re getting ready for {FACTS.countries}. Some things are still being switched on,
            such as withdrawals to UK banks, and our terms and privacy notice are drafts while a
            lawyer reviews them.
          </p>
          <Link
            href="/help"
            className="w-fit text-[17px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Questions? Ask us
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
