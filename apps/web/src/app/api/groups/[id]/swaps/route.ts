import { loadServerEnv } from "@/server/env";
import { handleProposeSwap, handleSwaps } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleSwaps(request, deps(), id);
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleProposeSwap(request, deps(), id);
}
