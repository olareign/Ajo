import { loadServerEnv } from "@/server/env";
import { handleScreen } from "@/server/screen-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return handleScreen(request, { env: loadServerEnv(process.env), fetchFn: fetch }, name);
}
