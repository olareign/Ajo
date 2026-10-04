import { loadServerEnv } from "@/server/env";
import { handleFund } from "@/server/payments-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleFund(request, { env: loadServerEnv(process.env), fetchFn: fetch });
