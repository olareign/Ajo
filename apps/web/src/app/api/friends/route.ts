import { loadServerEnv } from "@/server/env";
import { handleFriends } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleFriends(request, { env: loadServerEnv(process.env), fetchFn: fetch });
