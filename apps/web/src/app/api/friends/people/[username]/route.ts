import { loadServerEnv } from "@/server/env";
import { handlePerson } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  return handlePerson(request, { env: loadServerEnv(process.env), fetchFn: fetch }, username);
}
