import { loadServerEnv } from "@/server/env";
import {
  handleSecurityDelete,
  handleSecurityGet,
  handleSecurityPost,
} from "@/server/security-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ path: string[] }> };
const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export async function GET(request: Request, { params }: Context) {
  return handleSecurityGet(request, deps(), (await params).path);
}
export async function POST(request: Request, { params }: Context) {
  return handleSecurityPost(request, deps(), (await params).path);
}
export async function DELETE(request: Request, { params }: Context) {
  return handleSecurityDelete(request, deps(), (await params).path);
}
