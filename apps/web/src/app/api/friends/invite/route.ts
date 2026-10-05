import { loadServerEnv } from "@/server/env";
import { handleMyInvite, handleSetInvite } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });
export const GET = (request: Request) => handleMyInvite(request, deps());
export const PUT = (request: Request) => handleSetInvite(request, deps());
