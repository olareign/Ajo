import { loadServerEnv } from "@/server/env";
import { handleBanks } from "@/server/payments-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (request: Request) =>
  handleBanks(request, { env: loadServerEnv(process.env), fetchFn: fetch });
