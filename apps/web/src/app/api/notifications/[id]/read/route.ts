import { loadServerEnv } from "@/server/env";
import { handleRead } from "@/server/notifications-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleRead(request, { env: loadServerEnv(process.env), fetchFn: fetch }, id);
}
