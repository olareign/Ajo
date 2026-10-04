import { loadServerEnv } from "@/server/env";
import { handleSearch } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleSearch(request, { env: loadServerEnv(process.env), fetchFn: fetch });
