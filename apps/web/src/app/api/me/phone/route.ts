import { loadServerEnv } from "@/server/env";
import { handleRemovePhone, handleSetPhone } from "@/server/profile-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const PUT = (request: Request) => handleSetPhone(request, deps());
export const DELETE = (request: Request) => handleRemovePhone(request, deps());
