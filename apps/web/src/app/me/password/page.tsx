import type { Metadata } from "next";
import { PasswordScreen } from "@/components/security/PasswordScreen";

export const metadata: Metadata = { title: "Password", robots: { index: false } };

export default function Page() {
  return <PasswordScreen />;
}
