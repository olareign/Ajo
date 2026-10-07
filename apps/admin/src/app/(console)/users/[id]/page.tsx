import type { Metadata } from "next";
import { PersonScreen } from "@/components/screens/PersonScreen";

export const metadata: Metadata = { title: "Person" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonScreen id={id} />;
}
