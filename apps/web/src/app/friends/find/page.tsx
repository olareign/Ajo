import type { Metadata } from "next";
import { FindPeople } from "@/components/friends/FindPeople";

export const metadata: Metadata = { title: "Find people", robots: { index: false } };

export default function Page() {
  return <FindPeople />;
}
