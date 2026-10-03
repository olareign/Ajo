import { Lock, ShieldCheck, Sprout, type LucideIcon } from "lucide-react";

const REASONS: readonly { Icon: LucideIcon; text: string; delay: string }[] = [
  { Icon: ShieldCheck, text: "Everyone identity-checked", delay: "[--rise-delay:350ms]" },
  { Icon: Lock, text: "A deposit covers a miss", delay: "[--rise-delay:600ms]" },
  { Icon: Sprout, text: "Trust grows every round", delay: "[--rise-delay:850ms]" },
];

/** A shield pops in, then three reasons to trust the circle rise in beneath it. */
export function TrustScene() {
  return (
    <div className="grid justify-items-center gap-5">
      <svg viewBox="0 0 96 112" className="pop-in size-[104px]" aria-hidden>
        <path
          d="M48 4 12 18v30c0 28 15 49 36 60 21-11 36-32 36-60V18L48 4Z"
          className="fill-primary"
        />
        <path
          d="m31 56 12 12 23-26"
          fill="none"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-on-primary"
        />
      </svg>
      <ul className="grid gap-2">
        {REASONS.map(({ Icon, text, delay }) => (
          <li
            key={text}
            className={`motion-rise ${delay} flex items-center gap-3 rounded-full bg-surface-raised py-1.5 pr-5 pl-1.5 text-[15px] font-semibold shadow-lift`}
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary-tint text-primary">
              <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
