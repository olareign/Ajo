import { loadServerEnv } from "@/server/env";
import { handleCreateGroup, handleGroups } from "@/server/groups-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleGroups(request, deps());
export const POST = (request: Request) => handleCreateGroup(request, deps());
