import { loadServerEnv } from "@/server/env";
import { handlePersonAction, isPersonAction } from "@/server/friends-handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One address for the five things done to a person: accept, decline, cancel, remove, unblock.
export async function POST(
  request: Request,
  context: { params: Promise<{ username: string; action: string }> },
) {
  const { username, action } = await context.params;
  if (!isPersonAction(action)) return Response.json({ message: "Not found." }, { status: 404 });
  return handlePersonAction(
    request,
    { env: loadServerEnv(process.env), fetchFn: fetch },
    username,
    action,
  );
}
