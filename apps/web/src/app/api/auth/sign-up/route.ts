import { handleSignUp } from "@/server/auth-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";
// Room for the API to wake from sleep (see COLD_START_TIMEOUT_MS).
export const maxDuration = 60;

export function POST(request: Request) {
  return handleSignUp(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
