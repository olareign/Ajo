import { loadServerEnv } from "@/server/env";
import { handleUpdateProfile } from "@/server/me-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function PUT(request: Request) {
  return handleUpdateProfile(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
