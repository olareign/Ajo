import { loadServerEnv } from "@/server/env";
import {
  handleCancelMandate,
  handleCreateMandate,
  handleMandate,
} from "@/server/payments-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deps = () => ({ env: loadServerEnv(process.env), fetchFn: fetch });

export const GET = (request: Request) => handleMandate(request, deps());
export const POST = (request: Request) => handleCreateMandate(request, deps());
export const DELETE = (request: Request) => handleCancelMandate(request, deps());
