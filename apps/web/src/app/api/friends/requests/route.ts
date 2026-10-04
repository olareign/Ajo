import { loadServerEnv } from "@/server/env";
import { handleFriendRequests, handleSendRequest } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleFriendRequests(request, deps());
export const POST = (request: Request) => handleSendRequest(request, deps());
