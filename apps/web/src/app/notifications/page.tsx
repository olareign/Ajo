import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default function Page() {
  return <NotificationsScreen />;
}
