import { loadServerEnv } from "@/server/env";
import { handleEmailSettings, handleSaveEmailSettings } from "@/server/profile-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleEmailSettings(request, deps());
export const PUT = (request: Request) => handleSaveEmailSettings(request, deps());
