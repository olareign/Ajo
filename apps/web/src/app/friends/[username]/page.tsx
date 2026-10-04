import type { Metadata } from "next";
import { PersonScreen } from "@/components/friends/PersonScreen";

export const metadata: Metadata = { title: "Friends", robots: { index: false } };

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ username: string }> }>) {
  const { username } = await params;
  return <PersonScreen username={username} />;
}
