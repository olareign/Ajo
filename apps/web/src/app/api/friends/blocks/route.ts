import { loadServerEnv } from "@/server/env";
import { handleBlock, handleBlocks } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleBlocks(request, deps());
export const POST = (request: Request) => handleBlock(request, deps());
