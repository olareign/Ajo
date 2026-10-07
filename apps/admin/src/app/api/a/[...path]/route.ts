import { handleAdmin } from "@/server/bff";
import { loadServerEnv } from "@/server/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ path: string[] }> };
const run = async (request: Request, ctx: Context) =>
  handleAdmin(
    request,
    { env: loadServerEnv(process.env), fetchFn: fetch },
    (await ctx.params).path,
  );

export const GET = run;
export const POST = run;
