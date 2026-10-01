import { loadServerEnv } from "@/server/env";
import { handleSetPin } from "@/server/me-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function PUT(request: Request) {
  return handleSetPin(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
