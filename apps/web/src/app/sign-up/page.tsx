import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthScreen
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ScreenHeader
        backHref="/"
        title="Let's get you started"
        subtitle="Create your Àjọ account. It takes a minute."
      />
      <SignUpForm />
    </AuthScreen>
  );
}
