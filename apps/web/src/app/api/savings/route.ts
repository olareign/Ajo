import { loadServerEnv } from "@/server/env";
import { handleCreatePlan, handleSavingsList } from "@/server/savings-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleSavingsList(request, deps());
export const POST = (request: Request) => handleCreatePlan(request, deps());
