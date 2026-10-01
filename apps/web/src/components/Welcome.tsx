import Link from "next/link";
import { CircleRing } from "./CircleRing";

const SAMPLE_CIRCLE = [
  { name: "Adébáyọ̀ Ola", status: "paid" },
  { name: "Grace Ogunyemi", status: "paid" },
  { name: "Funmi Ojo", status: "paid" },
  { name: "Chidi Obi", status: "pending" },
  { name: "Kemi Adams", status: "pending" },
  { name: "Tolu Bello", status: "paid" },
  { name: "Segun Lawal", status: "pending" },
  { name: "Ada Eze", status: "paid" },
] as const;

const action =
  "flex min-h-14 w-full items-center justify-center rounded-m px-6 text-base font-semibold transition-colors";

/** First screen: the circle, one promise, and the two ways in. */
export function Welcome() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-10 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <CircleRing
          members={SAMPLE_CIRCLE}
          recipient={2}
          title="An example circle of eight"
          center={{ label: "THIS ROUND", value: "₦80,000" }}
          size={260}
        />
        <div className="grid gap-3 text-center">
          <h1 className="font-display text-[44px] leading-[46px] font-bold tracking-[-0.02em] text-balance">Àjọ</h1>
          <p className="text-[17px] leading-[26px] text-ink-muted">Save together, with people you trust.</p>
        </div>
      </div>
      <div className="grid gap-3">
        <Link href="/sign-up" className={`${action} bg-adire text-on-adire hover:bg-adire-deep`}>
          Create account
        </Link>
        <Link
          href="/sign-in"
          className={`${action} text-adire shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-adire-tint`}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
