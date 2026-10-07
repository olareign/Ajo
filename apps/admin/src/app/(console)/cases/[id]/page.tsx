import type { Metadata } from "next";
import { CaseScreen } from "@/components/screens/CaseScreen";

export const metadata: Metadata = { title: "Case" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseScreen id={id} />;
}
