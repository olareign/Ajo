import { Lock } from "lucide-react";

/** The recovery screen's mark: a lock in an indigo disc, with a few beads from the circle around it. */
export function RecoveryBadge() {
  return (
    <span aria-hidden="true" className="relative mb-8 grid size-20 place-items-center">
      <span className="grid size-20 place-items-center rounded-full bg-adire text-on-adire">
        <Lock className="size-9" strokeWidth={1.75} />
      </span>
      <span className="absolute -top-1 right-0 size-3.5 rounded-full bg-oro" />
      <span className="absolute -right-3 top-6 size-2.5 rounded-full bg-adire-tint" />
      <span className="absolute -bottom-1 -left-2 size-3 rounded-full bg-adire-tint" />
    </span>
  );
}
