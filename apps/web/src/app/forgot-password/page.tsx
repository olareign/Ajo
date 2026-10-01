import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { RecoveryBadge } from "@/components/auth/RecoveryBadge";
import { ScreenHeader } from "@/components/ScreenHeader";

export const metadata: Metadata = { title: "Password recovery" };

export default function ForgotPasswordPage() {
  return (
    <AuthScreen
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="pt-6">
        <RecoveryBadge />
      </div>
      <ScreenHeader
        title="Password recovery"
        subtitle="Enter your registered email and we'll send you a link to choose a new password."
      />
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
