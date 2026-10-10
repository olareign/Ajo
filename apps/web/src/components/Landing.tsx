import {
  ArrowRight,
  BellRing,
  Fingerprint,
  Globe2,
  HandCoins,
  KeyRound,
  ListChecks,
  Orbit,
  PiggyBank,
  ShieldCheck,
  Shuffle,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CircleRing } from "./CircleRing";
import { Logo } from "./Logo";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";

const STEPS: readonly { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "Start or join a circle",
    body: "Choose the amount, how often, and how many people. Friends first, or find one near your goal.",
    Icon: Users,
  },
  {
    title: "Agree the order",
    body: "By a draw anyone can check, by picking turns, or by who joined first. Two members can swap.",
    Icon: Shuffle,
  },
  {
    title: "Everyone pays in",
    body: "On each date, every member's share is collected from their wallet, or from their bank by auto-debit.",
    Icon: HandCoins,
  },
  {
    title: "One person is paid",
    body: "The whole pot goes to whoever's turn it is, until everyone has had theirs.",
    Icon: Orbit,
  },
];

const SAFETY: readonly { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "Deposits cover a missed payment",
    body: "New members lock a small deposit. If someone can't pay, it covers them, so the round still pays out in full.",
    Icon: ShieldCheck,
  },
  {
    title: "Trust that's earned",
    body: "Every payment on time builds a member's record. Early turns go to people others can count on.",
    Icon: ListChecks,
  },
  {
    title: "A second lock on your money",
    body: "Moving money needs your PIN and a code from an authenticator app, and every sign-in is recorded for you to see.",
    Icon: KeyRound,
  },
  {
    title: "Real people, checked",
    body: "Everyone verifies who they are before money moves, so you know who you're saving with.",
    Icon: Fingerprint,
  },
];

const FAQ: readonly { q: string; a: string }[] = [
  {
    q: "What is an èsúsú circle?",
    a: "A group of people who each pay the same amount on the same dates. Each round, the whole pot goes to one member, until everyone has had a turn. It's how many families and friends have always saved; Àjọ makes it organised and fair.",
  },
  {
    q: "What happens if someone doesn't pay?",
    a: "They get a short grace period and reminders. After that, their deposit covers the payment so the round pays out in full, their record shows it, and they can't join new circles for a while.",
  },
  {
    q: "Can I save on my own too?",
    a: "Yes. Saving plans take a set amount on your chosen days into a pot you can see grow, and pay it all back to your wallet at the end.",
  },
  {
    q: "Who is Àjọ for?",
    a: "People in Nigeria and the UK, and the diaspora saving with people back home. Your wallet is in your own currency.",
  },
  {
    q: "How do I get my money out?",
    a: "From your wallet to your bank account, with your PIN and authenticator code.",
  },
];

const band = "mx-auto w-full max-w-6xl px-8";

/**
 * The home page on a wide screen: what Àjọ is, how a circle works, why it's safe, and the two ways in.
 * Phones keep the shorter welcome screen. Everything said here describes what the app actually does.
 */
export function Landing({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className={`${band} flex h-16 items-center justify-between`}>
          <Link href="/" aria-label="Àjọ home">
            <Logo width={96} />
          </Link>
          <nav aria-label="Landing" className="flex items-center gap-6 text-[15px] font-semibold">
            <a href="#how" className="text-ink-muted hover:text-ink">
              How it works
            </a>
            <a href="#safe" className="text-ink-muted hover:text-ink">
              Safety
            </a>
            <a href="#questions" className="text-ink-muted hover:text-ink">
              Questions
            </a>
            <Link href="/sign-in" className="text-primary">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-10 items-center rounded-m bg-primary px-4 text-on-primary hover:bg-primary-deep"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={`${band} grid grid-cols-[1.1fr_1fr] items-center gap-12 py-20`}>
          <div className="grid gap-6">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-tint px-3 py-1 text-[13px] font-semibold text-primary">
              <Globe2 aria-hidden className="size-4" />
              For Nigeria, the UK and the diaspora
            </p>
            <h1 className="font-display text-[56px] leading-[60px] font-bold tracking-[-0.03em] text-balance">
              Save together, <span className="text-primary">safely.</span>
            </h1>
            <p className="max-w-xl text-[19px] leading-8 text-ink-muted">
              Àjọ turns the èsúsú circle you already trust into something organised and fair:
              everyone pays in on time, the order is clear, and deposits cover anyone who
              can&apos;t.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex min-h-14 items-center gap-2 rounded-m bg-primary px-6 text-base font-semibold text-on-primary hover:bg-primary-deep"
              >
                Create your account
                <ArrowRight aria-hidden className="size-5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-14 items-center rounded-m px-6 text-base font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-primary-tint"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="grid place-items-center">
            <CircleRing
              members={SAMPLE_CIRCLE.map((member, i) => ({ ...member, photo: photos[i] }))}
              recipient={2}
              title="An example circle of eight"
              center={{ label: "THIS ROUND", value: "₦80,000" }}
              size={380}
              roll
            />
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="bg-surface-sunken py-20">
          <div className={`${band} grid gap-10`}>
            <div className="grid max-w-2xl gap-3">
              <h2
                id="how-title"
                className="font-display text-[36px] leading-10 font-bold tracking-[-0.02em]"
              >
                How a circle works
              </h2>
              <p className="text-[17px] leading-7 text-ink-muted">
                Four steps, and everyone can see each one.
              </p>
            </div>
            <ol className="grid grid-cols-4 gap-5">
              {STEPS.map(({ title, body, Icon }, i) => (
                <li
                  key={title}
                  className="grid content-start gap-3 rounded-[var(--radius-l)] bg-surface-raised p-6 shadow-lift"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary-tint text-primary">
                      <Icon aria-hidden className="size-6" />
                    </span>
                    <span className="font-display text-[14px] font-bold text-ink-muted">
                      Step {i + 1}
                    </span>
                  </span>
                  <h3 className="text-[18px] leading-6 font-semibold">{title}</h3>
                  <p className="text-[15px] leading-6 text-ink-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="safe" aria-labelledby="safe-title" className="py-20">
          <div className={`${band} grid gap-10`}>
            <div className="grid max-w-2xl gap-3">
              <h2
                id="safe-title"
                className="font-display text-[36px] leading-10 font-bold tracking-[-0.02em]"
              >
                Built so no one is left out of pocket
              </h2>
              <p className="text-[17px] leading-7 text-ink-muted">
                The things that go wrong in a circle, handled before they happen.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-5">
              {SAFETY.map(({ title, body, Icon }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-[var(--radius-l)] bg-surface-raised p-6 shadow-lift"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-leaf-tint text-leaf">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span className="grid gap-1.5">
                    <h3 className="text-[18px] leading-6 font-semibold">{title}</h3>
                    <p className="text-[15px] leading-6 text-ink-muted">{body}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="solo-title" className="bg-surface-sunken py-20">
          <div className={`${band} grid grid-cols-2 items-center gap-12`}>
            <div className="grid gap-4">
              <h2
                id="solo-title"
                className="font-display text-[36px] leading-10 font-bold tracking-[-0.02em]"
              >
                And for saving on your own
              </h2>
              <p className="text-[17px] leading-7 text-ink-muted">
                Saving plans put a set amount aside on your chosen days, into a pot you can watch
                fill. Pause, top up, or finish, and it all comes back to your wallet.
              </p>
            </div>
            <ul className="grid gap-3">
              {(
                [
                  [PiggyBank, "A pot for each goal: rent, school fees, a trip home"],
                  [BellRing, "A reminder the day before each payment"],
                  [Users, "Friends who save with you, and see the same circle you do"],
                ] as const
              ).map(([Icon, text]) => (
                <li
                  key={text}
                  className="flex items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift text-[16px] font-medium"
                >
                  <Icon aria-hidden className="size-5 shrink-0 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="questions" aria-labelledby="questions-title" className="py-20">
          <div className={`${band} grid grid-cols-[1fr_1.6fr] gap-12`}>
            <h2
              id="questions-title"
              className="font-display text-[36px] leading-10 font-bold tracking-[-0.02em]"
            >
              Questions
            </h2>
            <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ArrowRight
                      aria-hidden
                      className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-6 text-ink-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="start-title" className="pb-20">
          <div className={`${band}`}>
            <div className="hero-card grid grid-cols-[1fr_auto] items-center gap-8 rounded-[var(--radius-xl)] p-10 shadow-lift">
              <div className="grid gap-2">
                <h2
                  id="start-title"
                  className="font-display text-[32px] leading-10 font-bold text-on-hero"
                >
                  Your circle, organised.
                </h2>
                <p className="text-[17px] text-on-hero-muted">It takes a few minutes to set up.</p>
              </div>
              <Link
                href="/sign-up"
                className="inline-flex min-h-14 items-center gap-2 rounded-m bg-oro px-6 text-base font-semibold text-on-oro hover:brightness-95"
              >
                Get started
                <ArrowRight aria-hidden className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className={`${band} flex items-center justify-between text-[14px] text-ink-muted`}>
          <span>© {new Date().getFullYear()} Àjọ</span>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/help" className="hover:text-ink">
              Help
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
