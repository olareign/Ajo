import type { Metadata } from "next";
import { CircleScreen } from "@/components/circles/CircleScreen";

export const metadata: Metadata = { title: "Circle", robots: { index: false } };

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <CircleScreen id={id} />;
}
