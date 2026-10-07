import { loadServerEnv } from "@/server/env";
import { handleSubscribePush, handleUnsubscribePush } from "@/server/profile-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const POST = (request: Request) => handleSubscribePush(request, deps());
export const DELETE = (request: Request) => handleUnsubscribePush(request, deps());
