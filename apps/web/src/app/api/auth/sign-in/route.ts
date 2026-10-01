import { handleSignIn } from "@/server/auth-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleSignIn(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
