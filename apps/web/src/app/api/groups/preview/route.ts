import { loadServerEnv } from "@/server/env";
import { handleGroupPreview } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleGroupPreview(request, { env: loadServerEnv(process.env), fetchFn: fetch });
