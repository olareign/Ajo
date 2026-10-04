import { loadServerEnv } from "@/server/env";
import { handleSavingsPreview } from "@/server/savings-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  handleSavingsPreview(request, { env: loadServerEnv(process.env), fetchFn: fetch });
