import { loadServerEnv } from "@/server/env";
import { handleTestPush } from "@/server/profile-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleTestPush(request, { env: loadServerEnv(process.env), fetchFn: fetch });
