import { loadServerEnv } from "@/server/env";
import { handleMe } from "@/server/me-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  return handleMe(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
