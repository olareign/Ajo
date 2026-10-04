import { loadServerEnv } from "@/server/env";
import { handleGroupByCode } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return handleGroupByCode(request, { env: loadServerEnv(process.env), fetchFn: fetch }, code);
}
