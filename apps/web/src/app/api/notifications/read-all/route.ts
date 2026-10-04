import { loadServerEnv } from "@/server/env";
import { handleReadAll } from "@/server/notifications-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleReadAll(request, { env: loadServerEnv(process.env), fetchFn: fetch });
