import { loadServerEnv } from "@/server/env";
import { handleWithdraw } from "@/server/payments-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleWithdraw(request, { env: loadServerEnv(process.env), fetchFn: fetch });
