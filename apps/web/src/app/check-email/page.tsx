import type { Metadata } from "next";
import { CheckEmail } from "@/components/auth/CheckEmail";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; from?: string }>;
}) {
  const { e, from } = await searchParams;
  // The address only decides what this page shows and who "resend" asks the API about; the API
  // validates it again and answers the same whoever it is.
  const email = typeof e === "string" && e.length <= 254 && e.includes("@") ? e : undefined;
  return <CheckEmail email={email} from={from === "sign-in" ? "sign-in" : undefined} />;
}
