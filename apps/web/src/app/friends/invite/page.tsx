import type { Metadata } from "next";
import { InviteScreen } from "@/components/friends/InviteScreen";

export const metadata: Metadata = { title: "Invite", robots: { index: false } };

export default function Page() {
  return <InviteScreen />;
}
