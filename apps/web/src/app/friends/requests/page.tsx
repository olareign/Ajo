import type { Metadata } from "next";
import { RequestsScreen } from "@/components/friends/RequestsScreen";

export const metadata: Metadata = { title: "Requests", robots: { index: false } };

export default function Page() {
  return <RequestsScreen />;
}
