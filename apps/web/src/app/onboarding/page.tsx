import type { Metadata } from "next";
import { join } from "node:path";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { listPeoplePhotos } from "@/lib/people-photos";

export const metadata: Metadata = { title: "Set up your account" };

export default function OnboardingPage() {
  return <OnboardingScreen photos={listPeoplePhotos(join(process.cwd(), "public", "people"))} />;
}
