import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { SignInForm } from "@/components/auth/SignInForm";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthScreen
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-adire underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      <ScreenHeader
        backHref="/"
        title="Hi there! 👋"
        subtitle="Welcome back. Sign in to your account."
      />
      <SignInForm />
    </AuthScreen>
  );
}
