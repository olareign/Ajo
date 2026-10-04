import { loadServerEnv } from "@/server/env";
import { handleAnswerSwap } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; swapId: string }> },
) {
  const { id, swapId } = await context.params;
  return handleAnswerSwap(request, { env: loadServerEnv(process.env), fetchFn: fetch }, id, swapId);
}
