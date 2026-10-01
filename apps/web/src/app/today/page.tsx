import type { Metadata } from "next";
import { TodayScreen } from "@/components/TodayScreen";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <TodayScreen />;
}
