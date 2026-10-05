import { loadServerEnv } from "@/server/env";
import { handleReferrals } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleReferrals(request, { env: loadServerEnv(process.env), fetchFn: fetch });
