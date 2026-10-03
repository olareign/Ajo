import { loadServerEnv } from "@/server/env";
import { handleTransactions } from "@/server/wallet-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  return handleTransactions(request, { env: loadServerEnv(process.env), fetchFn: fetch });
}
