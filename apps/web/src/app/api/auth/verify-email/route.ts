import { handleVerifyEmail } from "@/server/auth-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleVerifyEmail(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
