import { callApiBinary, type BinaryResult } from "./api-client";
import type { Deps } from "./auth-handlers";
import { json, withSessionCall } from "./me-handlers";
import { isSameOrigin } from "./same-origin";
import { USERNAME_PATTERN } from "@/lib/username";

/** The most a picture may weigh. The app sends it already cropped and small; this is only the ceiling. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const expired = (r: BinaryResult) => r.status === 401 && typeof r.data.code !== "string";
const asJson = (r: BinaryResult, cookies: string[]) => json(r.status, r.data, cookies);

/**
 * Setting the picture: from this app only, one of three picture types, and not over the ceiling. The
 * bytes go to the API untouched, which checks and redraws them; nothing else from the browser does.
 */
export async function handleSetPhoto(request: Request, deps: Deps): Promise<Response> {
  if (!isSameOrigin(request))
    return json(403, { message: "This request didn't come from the Àjọ app." });
  const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!TYPES.has(type)) return json(400, { message: "Send a JPEG, PNG or WebP picture." });
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > PHOTO_MAX_BYTES)
    return json(413, { message: "That picture is larger than 5 MB." });
  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json(400, { message: "Send a JPEG, PNG or WebP picture." });
  if (body.byteLength > PHOTO_MAX_BYTES)
    return json(413, { message: "That picture is larger than 5 MB." });
  return withSessionCall(
    request,
    deps,
    (accessToken, client) =>
      callApiBinary(deps.env, deps.fetchFn, {
        path: "/me/photo",
        method: "PUT",
        body,
        contentType: type,
        accessToken,
        client,
      }),
    expired,
    asJson,
  );
}

export function handleRemovePhoto(request: Request, deps: Deps): Promise<Response> {
  if (!isSameOrigin(request))
    return Promise.resolve(json(403, { message: "This request didn't come from the Àjọ app." }));
  return withSessionCall(
    request,
    deps,
    (accessToken, client) =>
      callApiBinary(deps.env, deps.fetchFn, {
        path: "/me/photo",
        method: "DELETE",
        accessToken,
        client,
      }),
    expired,
    asJson,
  );
}

/**
 * A person's picture as an image. Only a well-formed username reaches the API, which decides whether
 * this viewer may see it. Anything that is not a picture is a plain 404, so a missing photo and a
 * private one look the same. The browser keeps it for a day; `?v=` changes when the photo does.
 */
export function handleViewPhoto(request: Request, deps: Deps, username: string): Promise<Response> {
  const name = username.toLowerCase();
  const gone = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!USERNAME_PATTERN.test(name)) return Promise.resolve(gone());
  return withSessionCall(
    request,
    deps,
    (accessToken, client) =>
      callApiBinary(deps.env, deps.fetchFn, {
        path: `/photos/${name}`,
        method: "GET",
        accessToken,
        client,
      }),
    expired,
    (r, cookies) => {
      if (r.status !== 200 || !r.bytes || !r.contentType?.startsWith("image/")) return gone();
      const headers = new Headers({
        "Content-Type": r.contentType,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      });
      for (const c of cookies) headers.append("Set-Cookie", c);
      return new Response(r.bytes, { status: 200, headers });
    },
  );
}
