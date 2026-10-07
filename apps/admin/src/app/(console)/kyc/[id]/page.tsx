import type { Metadata } from "next";
import { KycPersonScreen } from "@/components/screens/KycPersonScreen";

export const metadata: Metadata = { title: "Identity" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KycPersonScreen id={id} />;
}
