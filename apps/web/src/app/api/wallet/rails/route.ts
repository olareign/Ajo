import { loadServerEnv } from "@/server/env";
import { handleRails } from "@/server/kyc-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  return handleRails(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
