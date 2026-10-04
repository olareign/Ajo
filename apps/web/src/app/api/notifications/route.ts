import { loadServerEnv } from "@/server/env";
import { handleNotifications } from "@/server/notifications-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleNotifications(request, { env: loadServerEnv(process.env), fetchFn: fetch });
