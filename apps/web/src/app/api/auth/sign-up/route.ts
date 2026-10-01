import { handleSignUp } from "@/server/auth-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleSignUp(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
