import { money } from "@ajo/domain";
import type { GroupSummary } from "@/components/GroupCard";

/** Sample data from the Figma designs, shown until the groups API (E6) exists. */
export const DEMO_PRIVATE_GROUPS: GroupSummary[] = [
  {
    id: "aso-ebi",
    name: "Aso Ebi",
    status: "active",
    contribution: money(1_000_000, "NGN"),
    frequency: "weekly",
    size: 7,
    memberCount: 5,
    nextDueDate: "2027-01-19",
    members: [
      { id: "1", name: "Adenike Aiyegbiorju" },
      { id: "2", name: "Grace Ogunyemi" },
      { id: "3", name: "Funmi Ojo" },
      { id: "4", name: "Segun Aiyegbiroju" },
      { id: "5", name: "Tolu Bello" },
    ],
  },
  {
    id: "phone-gang",
    name: "Phone Gang",
    status: "active",
    contribution: money(1_000_000, "NGN"),
    frequency: "weekly",
    size: 10,
    memberCount: 6,
    nextDueDate: "2027-01-19",
    members: [
      { id: "1", name: "Grace Ogunyemi" },
      { id: "2", name: "Funmi Ojo" },
      { id: "3", name: "Kemi Adams" },
      { id: "4", name: "Ade Lawal" },
      { id: "5", name: "Bisi Ojo" },
      { id: "6", name: "Chidi Obi" },
    ],
  },
];

export const DEMO_PUBLIC_GROUPS: GroupSummary[] = [
  {
    id: "plot-of-land",
    name: "Plot of Land",
    status: "open",
    contribution: money(10_000_000, "NGN"),
    frequency: "monthly",
    size: 5,
    memberCount: 3,
    nextDueDate: "2027-01-19",
    members: [
      { id: "1", name: "Segun Aiyegbiroju" },
      { id: "2", name: "Ade Lawal" },
      { id: "3", name: "Kemi Adams" },
    ],
  },
];
