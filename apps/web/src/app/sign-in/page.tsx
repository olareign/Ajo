import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <ScreenHeader backHref="/" eyebrow="Welcome back" title="Sign in" />
      <SignInForm />
      <p className="mt-6 text-center text-[15px] text-ink-muted">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-adire underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </main>
  );
}
