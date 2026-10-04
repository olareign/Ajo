import { loadServerEnv } from "@/server/env";
import { handleKyc } from "@/server/kyc-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  return handleKyc(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
