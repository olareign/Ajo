import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";

export const metadata: Metadata = { title: "Set up your account" };

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
