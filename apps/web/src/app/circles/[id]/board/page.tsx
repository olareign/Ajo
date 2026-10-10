import type { Metadata } from "next";
import { CircleBoard } from "@/components/circles/CircleBoard";

export const metadata: Metadata = { title: "Circle board", robots: { index: false } };

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return <CircleBoard id={id} />;
}
