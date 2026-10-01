import Link from "next/link";
import { CircleRing } from "./CircleRing";
import { Logo } from "./Logo";

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
export function Welcome({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  return (
    <main className="flex min-h-dvh flex-col overflow-x-clip px-4 pt-10 pb-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <CircleRing
          members={SAMPLE_CIRCLE.map((member, i) => ({ ...member, photo: photos[i] }))}
          recipient={2}
          title="An example circle of eight"
          center={{ label: "THIS ROUND", value: "₦80,000" }}
          size={260}
          roll
        />
        <div className="grid justify-items-center gap-4 text-center">
          <h1 className="m-0">
            <span className="sr-only">Àjọ</span>
            <span aria-hidden="true" className="block">
              <Logo width={280} animated />
            </span>
          </h1>
          <p className="motion-rise text-[17px] leading-[26px] text-ink-muted [--rise-delay:1100ms]">
            Save together, with people you trust.
          </p>
        </div>
      </div>
      <div className="motion-rise grid gap-3 [--rise-delay:1250ms]">
        <Link
          href="/sign-up"
          className={`${action} bg-primary text-on-primary hover:bg-primary-deep`}
        >
          Create account
        </Link>
        <Link
          href="/sign-in"
          className={`${action} text-primary shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-primary-tint`}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
