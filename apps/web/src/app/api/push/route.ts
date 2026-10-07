import { loadServerEnv } from "@/server/env";
import { handlePushStatus } from "@/server/profile-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handlePushStatus(request, { env: loadServerEnv(process.env), fetchFn: fetch });
