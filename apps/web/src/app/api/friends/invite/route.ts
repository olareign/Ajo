import { loadServerEnv } from "@/server/env";
import { handleMyInvite } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleMyInvite(request, { env: loadServerEnv(process.env), fetchFn: fetch });
