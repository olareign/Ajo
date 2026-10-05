import type { Metadata } from "next";
import { JoinCircle } from "@/components/circles/JoinCircle";

export const metadata: Metadata = { title: "Join a circle", robots: { index: false } };

export default async function Page({ params }: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return <JoinCircle code={code} />;
}
