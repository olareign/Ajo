import { loadServerEnv } from "@/server/env";
import { handleDiscover } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleDiscover(request, { env: loadServerEnv(process.env), fetchFn: fetch });
