import type { Metadata } from "next";
import { JoinScreen } from "@/components/friends/JoinScreen";

export const metadata: Metadata = { title: "You're invited to Àjọ" };

export default async function Page({ params }: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return <JoinScreen code={code} />;
}
