import type { Metadata } from "next";
import { HelpScreen } from "@/components/legal/HelpScreen";
import { supportEmail } from "@/server/site-contact";

export const metadata: Metadata = { title: "Help" };

/**
 * Help from inside the app: the app's own help screen in the app's frame (the sidebar on a desk,
 * the tab bar on a phone), so asking for help doesn't feel like leaving. The public page is /help.
 */
export default async function Page() {
  return <HelpScreen supportEmail={await supportEmail()} />;
}
