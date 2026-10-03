import { handleSignOutAll } from "@/server/auth-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST(request: Request) {
  return handleSignOutAll(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
