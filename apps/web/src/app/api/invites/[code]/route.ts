import { loadServerEnv } from "@/server/env";
import { handleInvite } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return handleInvite(request, { env: loadServerEnv(process.env), fetchFn: fetch }, code);
}
