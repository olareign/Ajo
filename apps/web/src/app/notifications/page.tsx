import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function Page() {
  return <NotificationsScreen />;
}
