import { handleMfaDisable, handleMfaEnrol } from "@/server/mfa-handlers";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const POST = (request: Request) => handleMfaEnrol(request, deps());
export const DELETE = (request: Request) => handleMfaDisable(request, deps());
