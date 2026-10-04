import type { InstallKind } from "@/lib/install";

const STEPS: Record<"ios" | "manual", readonly string[]> = {
  ios: [
    "In Safari, tap the Share button (the square with an arrow).",
    "Scroll down and tap Add to Home Screen.",
    "Tap Add. Àjọ appears with the new icon.",
  ],
  manual: [
    "Open your browser's menu (the three dots).",
    "Choose Install app or Add to Home screen.",
    "Confirm. Àjọ appears with the new icon.",
  ],
};

/** The by-hand way, for browsers that give an app no install dialog or have already used theirs up. */
export function InstallSteps({ kind }: Readonly<{ kind: InstallKind | "unknown" }>) {
  const steps = kind === "ios" ? STEPS.ios : STEPS.manual;
  return (
    <ol className="grid grid-cols-1 gap-2 text-[14px] leading-5 text-ink">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-tint text-[12px] font-semibold text-primary"
          >
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
