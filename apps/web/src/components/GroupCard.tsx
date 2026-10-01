import {
  formatMoney,
  formatMoneyCompact,
  multiply,
  slotsRemaining,
  type CalendarDate,
  type Money,
} from "@ajo/domain";
import Link from "next/link";
import { ProgressBar } from "./ui/ProgressBar";

export type GroupSummary = Readonly<{
  id: string;
  name: string;
  status: "open" | "active" | "completed";
  contribution: Money;
  frequency: "weekly" | "monthly";
  size: number;
  memberCount: number;
  nextDueDate: CalendarDate;
  members: readonly { id: string; name: string }[];
}>;

const STATUS_LABEL: Record<GroupSummary["status"], string> = {
  open: "Open",
  active: "Active",
  completed: "Completed",
};

const VISIBLE_AVATARS = 3;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDueDate(date: CalendarDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function GroupCard({ group, locale }: Readonly<{ group: GroupSummary; locale: string }>) {
  const slots = slotsRemaining({ size: group.size, memberCount: group.memberCount });
  const filled = Math.floor((group.memberCount * 100) / group.size);
  const extra = group.members.length - VISIBLE_AVATARS;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block rounded-card bg-surface-muted p-3 focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1.5" aria-hidden>
          {group.members.slice(0, VISIBLE_AVATARS).map((m) => (
            <span
              key={m.id}
              data-testid="avatar"
              className="flex size-8 items-center justify-center rounded-full border-2 border-surface-muted bg-brand-800 text-[10px] font-semibold text-white"
            >
              {initials(m.name)}
            </span>
          ))}
          {extra > 0 && (
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-surface-muted bg-ink/80 text-[10px] text-white">
              +{extra}
            </span>
          )}
        </div>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-brand-600">
          {STATUS_LABEL[group.status]}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">{group.name}</h2>
        <p className="text-xs text-ink-muted">
          Payout:{" "}
          <span className="text-xl font-bold text-brand-600">
            {formatMoney(multiply(group.contribution, group.size), locale)}
          </span>
        </p>
      </div>

      <div className="mt-1 flex justify-between text-xs text-ink-muted">
        <p>
          Next due date:{" "}
          <span className="font-semibold text-ink">{formatDueDate(group.nextDueDate, locale)}</span>
        </p>
        <p>
          Amount:{" "}
          <span className="font-semibold text-ink">
            {formatMoneyCompact(group.contribution, locale)} {group.frequency}
          </span>
        </p>
      </div>

      <ProgressBar value={filled} label="Slots filled" className="mt-3" />
      <p className="mt-1 text-right text-[10px] text-danger">
        {slots.full ? "Full" : `${slots.remaining}/${slots.size} remaining`}
      </p>
    </Link>
  );
}
