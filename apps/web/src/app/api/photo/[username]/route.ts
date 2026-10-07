import { loadServerEnv } from "@/server/env";
import { handleViewPhoto } from "@/server/photo-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, ctx: { params: Promise<{ username: string }> }) {
  const { username } = await ctx.params;
  return handleViewPhoto(request, { env: loadServerEnv(process.env), fetchFn: fetch }, username);
}
