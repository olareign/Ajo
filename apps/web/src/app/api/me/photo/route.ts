import { loadServerEnv } from "@/server/env";
import { handleRemovePhoto, handleSetPhoto } from "@/server/photo-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const PUT = (request: Request) => handleSetPhoto(request, deps());
export const DELETE = (request: Request) => handleRemovePhoto(request, deps());
