import { loadServerEnv } from "@/server/env";
import { handlePlanAction, isPlanAction } from "@/server/savings-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await context.params;
  if (!isPlanAction(action)) return Response.json({ message: "Not found." }, { status: 404 });
  return handlePlanAction(request, { env: loadServerEnv(process.env), fetchFn: fetch }, id, action);
}
