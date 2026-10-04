import { loadServerEnv } from "@/server/env";
import { handlePayoutAccount, handleSetPayoutAccount } from "@/server/payments-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handlePayoutAccount(request, deps());
export const PUT = (request: Request) => handleSetPayoutAccount(request, deps());
