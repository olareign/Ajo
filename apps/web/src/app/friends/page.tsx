import type { Metadata } from "next";
import { FriendsHome } from "@/components/friends/FriendsHome";

export const metadata: Metadata = { title: "Friends", robots: { index: false } };

export default function Page() {
  return <FriendsHome />;
}
