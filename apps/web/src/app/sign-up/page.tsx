import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10">
      <ScreenHeader backHref="/" eyebrow="Welcome" title="Let's get you started" />
      <SignUpForm />
    </main>
  );
}
