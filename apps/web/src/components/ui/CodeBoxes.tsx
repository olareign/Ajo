import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = Readonly<{
  value: string;
  length?: number;
  label: string;
  error?: string;
}>;

/**
 * One box per digit of a one-time code. Unlike a PIN, the digits are shown as they are typed:
 * the code changes every 30 seconds and the person needs to check it against their phone.
 */
export function CodeBoxes({ value, length = 6, label, error }: Props) {
  const labelId = useId();
  const errorId = `${labelId}-error`;
  return (
    <div className="grid gap-3">
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex justify-between gap-2"
      >
        <span id={labelId} className="sr-only">
          {label}
        </span>
        {Array.from({ length }, (_, i) => {
          const active = i === value.length;
          return (
            <span
              key={i}
              data-box=""
              data-active={active ? "" : undefined}
              aria-hidden
              className={cn(
                "grid h-16 min-w-0 flex-1 place-items-center rounded-m border-[1.5px] bg-surface-sunken font-display text-[26px] font-semibold text-adire tabular-nums transition-colors",
                active ? "border-adire bg-surface-raised" : "border-transparent",
                error && "border-danger",
              )}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {`${value.length} of ${length} digits entered`}
      </p>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-[13px] font-medium text-danger"
        >
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
