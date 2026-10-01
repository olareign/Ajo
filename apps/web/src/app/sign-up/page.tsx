import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <ScreenHeader backHref="/" eyebrow="Welcome" title="Let's get you started" />
      <SignUpForm />
    </main>
  );
}
