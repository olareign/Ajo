// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleRemovePhoto,
  handleSetPhoto,
  handleViewPhoto,
  PHOTO_MAX_BYTES,
} from "./photo-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const API = "https://api.ajo.example/api/v1";

async function req(method: string, init: { body?: BodyInit; type?: string; site?: string } = {}) {
  const sealed = await seal({ accessToken: "a", refreshToken: "r" }, env.sessionSecret, 3600);
  const headers: Record<string, string> = {
    "Sec-Fetch-Site": init.site ?? "same-origin",
    Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
  };
  if (init.type) headers["Content-Type"] = init.type;
  return new Request("https://app.ajo.example/api/me/photo", { method, headers, body: init.body });
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

describe("setting the picture", () => {
  it("passes the bytes on untouched with their type, and returns the API's answer", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({ version: 7 }));
    const res = await handleSetPhoto(await req("PUT", { body: PNG, type: "image/png" }), {
      env,
      fetchFn,
    });
    expect(await res.json()).toEqual({ version: 7 });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(`${API}/me/photo`);
    expect(init?.method).toBe("PUT");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("image/png");
    expect(new Uint8Array(init?.body as ArrayBuffer)).toEqual(PNG);
  });

  it("refuses other sites, other types, nothing, and anything over the ceiling, without calling the API", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({}));
    const deps = { env, fetchFn };
    expect(
      (
        await handleSetPhoto(
          await req("PUT", { body: PNG, type: "image/png", site: "cross-site" }),
          deps,
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleSetPhoto(await req("PUT", { body: "<svg/>", type: "image/svg+xml" }), deps))
        .status,
    ).toBe(400);
    expect((await handleSetPhoto(await req("PUT", { type: "image/png" }), deps)).status).toBe(400);
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    expect(
      (await handleSetPhoto(await req("PUT", { body: big, type: "image/jpeg" }), deps)).status,
    ).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("removes the picture, from this app only", async () => {
    const fetchFn = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));
    expect(
      (await handleRemovePhoto(await req("DELETE", { site: "cross-site" }), { env, fetchFn }))
        .status,
    ).toBe(403);
    expect((await handleRemovePhoto(await req("DELETE"), { env, fetchFn })).status).toBe(204);
    expect(fetchFn.mock.calls[0]![1]?.method).toBe("DELETE");
  });
});

describe("viewing a picture", () => {
  const image = () => new Response(PNG, { headers: { "content-type": "image/webp" } });

  it("serves it as an image that is kept a day and never run as anything else", async () => {
    const fetchFn = vi.fn<Fetch>(async () => image());
    const res = await handleViewPhoto(await req("GET"), { env, fetchFn }, "Ada_01");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toBe("private, max-age=86400");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(fetchFn.mock.calls[0]![0]).toBe(`${API}/photos/ada_01`);
  });

  it("only well-formed usernames reach the API, and every miss is the same plain 404", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({ message: "no" }, { status: 404 }));
    for (const bad of ["../me", "a b", "x", "ada/../../admin", "A".repeat(40)]) {
      expect((await handleViewPhoto(await req("GET"), { env, fetchFn }, bad)).status).toBe(404);
    }
    expect(fetchFn).not.toHaveBeenCalled();
    const miss = await handleViewPhoto(await req("GET"), { env, fetchFn }, "ada_01");
    expect(miss.status).toBe(404);
    expect(miss.headers.get("cache-control")).toBe("no-store");
    expect(await miss.text()).toBe("");
  });

  it("will not pass off a non-image answer as a picture", async () => {
    const fetchFn = vi.fn<Fetch>(
      async () =>
        new Response("<script>x()</script>", { headers: { "content-type": "text/html" } }),
    );
    expect((await handleViewPhoto(await req("GET"), { env, fetchFn }, "ada_01")).status).toBe(404);
  });

  it("answers 401 without a session, and does not ask the API", async () => {
    const fetchFn = vi.fn<Fetch>(async () => image());
    const res = await handleViewPhoto(
      new Request("https://app.ajo.example/api/photo/ada_01"),
      { env, fetchFn },
      "ada_01",
    );
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
