// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleBlock,
  handleBlocks,
  handleFriends,
  handleInvite,
  handleMyInvite,
  handlePerson,
  handlePersonAction,
  handleReport,
  handleSearch,
  handleSendRequest,
  handleSuggestions,
  isPersonAction,
} from "./friends-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";

async function req(
  method: string,
  body?: unknown,
  site = "same-origin",
  url = "/api/x",
  signedIn = true,
) {
  const sealed = await seal(
    { accessToken: "old-access", refreshToken: "old-refresh" },
    env.sessionSecret,
    3600,
  );
  const headers: Record<string, string> = { "Sec-Fetch-Site": site };
  if (signedIn) headers.Cookie = `__Host-ajo_session=${encodeURIComponent(sealed)}`;
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`${base}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
const reply = (status: number, body: unknown = {}) => Response.json(body, { status });
const call = (f: ReturnType<typeof vi.fn<Fetch>>) => {
  const [url, init] = f.mock.calls[0]!;
  return { url, init: init!, headers: new Headers(init!.headers) };
};

describe("reading", () => {
  it.each([
    ["friends", handleFriends, "/friends"],
    ["suggestions", handleSuggestions, "/friends/suggestions"],
    ["invite", handleMyInvite, "/friends/invite"],
    ["blocks", handleBlocks, "/friends/blocks"],
  ])(
    "reads %s as the signed-in person, from nothing the browser sent",
    async (_n, handler, path) => {
      const fetchFn = vi.fn<Fetch>(async () => reply(200, {}));
      await handler(await req("GET"), { env, fetchFn });
      expect(call(fetchFn).url).toBe(`https://api.ajo.example/api/v1${path}`);
      expect(call(fetchFn).headers.get("Authorization")).toBe("Bearer old-access");
    },
  );

  it("searches with a tidied username start, and only if it is one", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, []));
    await handleSearch(
      await req("GET", undefined, "same-origin", "/api/friends/search?q=%20@Ada_ol%20&x=1"),
      { env, fetchFn },
    );
    expect(call(fetchFn).url).toBe("https://api.ajo.example/api/v1/friends/search?q=Ada_ol");
    for (const bad of ["", "ab", "9abc", "ab%", "a b c", "../me", "x".repeat(21)]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      const res = await handleSearch(
        await req(
          "GET",
          undefined,
          "same-origin",
          `/api/friends/search?q=${encodeURIComponent(bad)}`,
        ),
        { env, fetchFn: none },
      );
      expect(res.status).toBe(400);
      expect(none).not.toHaveBeenCalled();
    }
  });

  it("opens one person's card only by a well-formed username", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, {}));
    await handlePerson(await req("GET"), { env, fetchFn }, "ada_ola");
    expect(call(fetchFn).url).toBe("https://api.ajo.example/api/v1/friends/people/ada_ola");
    for (const bad of ["../me", "ab", "a/b", "ada ola", "9ada"]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      expect((await handlePerson(await req("GET"), { env, fetchFn: none }, bad)).status).toBe(404);
      expect(none).not.toHaveBeenCalled();
    }
  });
});

describe("doing things", () => {
  it("sends a request, a block and a report with only their own fields, from this app only", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, {}));
    await handleSendRequest(await req("POST", { username: "ada_ola", userId: "x" }), {
      env,
      fetchFn,
    });
    expect(JSON.parse(call(fetchFn).init.body as string)).toEqual({ username: "ada_ola" });
    expect(call(fetchFn).url).toBe("https://api.ajo.example/api/v1/friends/requests");

    const block = vi.fn<Fetch>(async () => reply(204));
    await handleBlock(await req("POST", { username: "ada_ola" }), { env, fetchFn: block });
    expect(call(block).url).toBe("https://api.ajo.example/api/v1/friends/blocks");

    const report = vi.fn<Fetch>(async () => reply(204));
    await handleReport(
      await req("POST", { username: "ada_ola", reason: "scam", details: "d", extra: 1 }),
      { env, fetchFn: report },
    );
    expect(JSON.parse(call(report).init.body as string)).toEqual({
      username: "ada_ola",
      reason: "scam",
      details: "d",
    });

    const blocked = vi.fn<Fetch>(async () => reply(200));
    for (const handler of [handleSendRequest, handleBlock, handleReport]) {
      expect(
        (
          await handler(await req("POST", { username: "ada_ola" }, "cross-site"), {
            env,
            fetchFn: blocked,
          })
        ).status,
      ).toBe(403);
    }
    expect(blocked).not.toHaveBeenCalled();
  });

  it("knows its five actions and no others", () => {
    expect(["accept", "decline", "cancel", "remove", "unblock"].every(isPersonAction)).toBe(true);
    expect(isPersonAction("block")).toBe(false);
    expect(isPersonAction("constructor")).toBe(false);
  });

  it.each([
    ["accept", "POST", "/friends/requests/ada_ola/accept"],
    ["decline", "DELETE", "/friends/requests/ada_ola/received"],
    ["cancel", "DELETE", "/friends/requests/ada_ola"],
    ["remove", "DELETE", "/friends/ada_ola"],
    ["unblock", "DELETE", "/friends/blocks/ada_ola"],
  ] as const)(
    "does %s with the API's own %s, on a lower-cased well-formed name",
    async (action, method, path) => {
      const fetchFn = vi.fn<Fetch>(async () => reply(200, {}));
      await handlePersonAction(await req("POST"), { env, fetchFn }, "Ada_Ola", action);
      expect(call(fetchFn).url).toBe(`https://api.ajo.example/api/v1${path}`);
      expect(call(fetchFn).init.method).toBe(method);
    },
  );

  it("refuses an action from another site or on a malformed name, and calls nothing", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handlePersonAction(
          await req("POST", undefined, "cross-site"),
          { env, fetchFn },
          "ada_ola",
          "remove",
        )
      ).status,
    ).toBe(403);
    expect(
      (await handlePersonAction(await req("POST"), { env, fetchFn }, "../x", "remove")).status,
    ).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("an invite link, before sign-in", () => {
  it("asks who it is from without a session, and passes nothing from the browser", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { name: "Ada", username: "ada_ola" }));
    const res = await handleInvite(
      await req("GET", undefined, "same-origin", "/api/invites/K7M2QH9R", false),
      { env, fetchFn },
      "K7M2QH9R",
    );
    expect(await res.json()).toEqual({ name: "Ada", username: "ada_ola" });
    expect(call(fetchFn).url).toBe("https://api.ajo.example/api/v1/invites/K7M2QH9R");
    expect(call(fetchFn).headers.get("Authorization")).toBeNull();
  });

  it("does not ask for a code that cannot be one", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    for (const bad of ["short", "../x", "K7M2QH9R9", "K7M2 QH9"]) {
      expect((await handleInvite(await req("GET"), { env, fetchFn }, bad)).status).toBe(404);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
