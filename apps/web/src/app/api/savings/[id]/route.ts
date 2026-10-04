import { loadServerEnv } from "@/server/env";
import { handlePlan } from "@/server/savings-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handlePlan(request, { env: loadServerEnv(process.env), fetchFn: fetch }, id);
}
