// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleAnswerSwap,
  handleCreateGroup,
  handleDiscover,
  handleGroup,
  handleGroupAction,
  handleGroupByCode,
  handleGroupPreview,
  handleGroups,
  handleJoinByCode,
  handleProposeSwap,
  handleSwaps,
  isGroupAction,
} from "./groups-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";
const KEY = "k_0123456789abcdef";
const ID = "3f0c8a52-1d4e-4c7a-9b0e-6a2f5d8c1e47";
const SWAP = "7a1d2c9e-5b3f-4e8a-8c21-0d4f6a9b3e15";
const GROUP = {
  name: "Cousins",
  community: "Family",
  contribution: "500000",
  frequency: "monthly",
  size: 6,
  startDate: "2026-11-15",
  orderMethod: "random",
  visibility: "private",
};

async function req(
  method: string,
  body?: unknown,
  extra: Record<string, string> = {},
  site = "same-origin",
) {
  const sealed = await seal(
    { accessToken: "old-access", refreshToken: "old-refresh" },
    env.sessionSecret,
    3600,
  );
  const headers: Record<string, string> = {
    "Sec-Fetch-Site": site,
    Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
    ...extra,
  };
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`${base}/api/x`, {
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

describe("making a circle", () => {
  it("passes on the circle's own fields and the safety key, nothing else", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(201, { id: ID }));
    await handleCreateGroup(
      await req(
        "POST",
        { ...GROUP, creatorId: "x" },
        { "Idempotency-Key": KEY, "X-Forwarded-For": "6.6.6.6" },
      ),
      { env, fetchFn },
    );
    const c = call(fetchFn);
    expect(c.url).toBe("https://api.ajo.example/api/v1/groups");
    expect(JSON.parse(c.init.body as string)).toEqual(GROUP);
    expect(c.headers.get("Idempotency-Key")).toBe(KEY);
    expect(c.headers.get("X-Forwarded-For")).toBeNull();
  });

  it("refuses without a safety key or from another site, but previews without a key", async () => {
    const none = vi.fn<Fetch>(async () => reply(201));
    expect((await handleCreateGroup(await req("POST", GROUP), { env, fetchFn: none })).status).toBe(
      400,
    );
    expect(
      (
        await handleCreateGroup(
          await req("POST", GROUP, { "Idempotency-Key": KEY }, "cross-site"),
          { env, fetchFn: none },
        )
      ).status,
    ).toBe(403);
    expect(none).not.toHaveBeenCalled();
    const preview = vi.fn<Fetch>(async () => reply(200, {}));
    await handleGroupPreview(await req("POST", GROUP), { env, fetchFn: preview });
    expect(call(preview).url).toBe("https://api.ajo.example/api/v1/groups/preview");
  });

  it("reads the list and the discovery list", async () => {
    for (const [handler, path] of [
      [handleGroups, "/groups"],
      [handleDiscover, "/groups/discover"],
    ] as const) {
      const fetchFn = vi.fn<Fetch>(async () => reply(200, { groups: [] }));
      await handler(await req("GET"), { env, fetchFn });
      expect(call(fetchFn).url).toBe(`https://api.ajo.example/api/v1${path}`);
    }
  });
});

describe("one circle", () => {
  it("looks one up only by a well-formed id, or by a well-formed code (in capitals)", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, {}));
    await handleGroup(await req("GET"), { env, fetchFn }, ID);
    expect(call(fetchFn).url).toBe(`https://api.ajo.example/api/v1/groups/${ID}`);
    const byCode = vi.fn<Fetch>(async () => reply(200, {}));
    await handleGroupByCode(await req("GET"), { env, fetchFn: byCode }, "k7m2qh9r");
    expect(call(byCode).url).toBe("https://api.ajo.example/api/v1/groups/code/K7M2QH9R");
    for (const bad of ["discover", "../me", `${ID}/leave`]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      expect((await handleGroup(await req("GET"), { env, fetchFn: none }, bad)).status).toBe(404);
      expect(none).not.toHaveBeenCalled();
    }
    for (const bad of ["short", "K7M2QH9R9", "K7M2 QH9", "../x"]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      expect((await handleGroupByCode(await req("GET"), { env, fetchFn: none }, bad)).status).toBe(
        404,
      );
      expect(none).not.toHaveBeenCalled();
    }
  });

  it("knows its five actions and no others", () => {
    expect(["join", "leave", "cancel", "invite", "pick"].every(isGroupAction)).toBe(true);
    expect(isGroupAction("delete")).toBe(false);
    expect(isGroupAction("constructor")).toBe(false);
  });

  it("joins by code with only the code, and does the actions with only their own fields", async () => {
    const join = vi.fn<Fetch>(async () => reply(200, {}));
    await handleJoinByCode(await req("POST", { code: "K7M2QH9R", extra: 1 }), {
      env,
      fetchFn: join,
    });
    expect(JSON.parse(call(join).init.body as string)).toEqual({ code: "K7M2QH9R" });

    const pick = vi.fn<Fetch>(async () => reply(200, {}));
    await handleGroupAction(
      await req("POST", { spot: 3, other: 1 }),
      { env, fetchFn: pick },
      ID,
      "pick",
    );
    expect(call(pick).url).toBe(`https://api.ajo.example/api/v1/groups/${ID}/pick`);
    expect(JSON.parse(call(pick).init.body as string)).toEqual({ spot: 3 });

    const invite = vi.fn<Fetch>(async () => reply(204));
    await handleGroupAction(
      await req("POST", { username: "ada_ola" }),
      { env, fetchFn: invite },
      ID,
      "invite",
    );
    expect(JSON.parse(call(invite).init.body as string)).toEqual({ username: "ada_ola" });

    for (const action of ["join", "leave", "cancel"] as const) {
      const f = vi.fn<Fetch>(async () => reply(200, {}));
      await handleGroupAction(await req("POST"), { env, fetchFn: f }, ID, action);
      expect(call(f).url).toBe(`https://api.ajo.example/api/v1/groups/${ID}/${action}`);
      expect(call(f).init.body).toBeUndefined();
    }
  });

  it("refuses an action from another site, or on a malformed id, and calls nothing", async () => {
    const none = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handleGroupAction(
          await req("POST", undefined, {}, "cross-site"),
          { env, fetchFn: none },
          ID,
          "leave",
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleGroupAction(await req("POST"), { env, fetchFn: none }, "../x", "leave")).status,
    ).toBe(404);
    expect(
      (
        await handleJoinByCode(await req("POST", { code: "K7M2QH9R" }, {}, "cross-site"), {
          env,
          fetchFn: none,
        })
      ).status,
    ).toBe(403);
    expect(none).not.toHaveBeenCalled();
  });
});

describe("trading turns", () => {
  it("lists, asks and answers, by well-formed ids only", async () => {
    const list = vi.fn<Fetch>(async () => reply(200, []));
    await handleSwaps(await req("GET"), { env, fetchFn: list }, ID);
    expect(call(list).url).toBe(`https://api.ajo.example/api/v1/groups/${ID}/swaps`);
    const ask = vi.fn<Fetch>(async () => reply(200, {}));
    await handleProposeSwap(
      await req("POST", { username: "ada_ola", x: 1 }),
      { env, fetchFn: ask },
      ID,
    );
    expect(JSON.parse(call(ask).init.body as string)).toEqual({ username: "ada_ola" });
    const answer = vi.fn<Fetch>(async () => reply(200, {}));
    await handleAnswerSwap(
      await req("POST", { accept: true, x: 1 }),
      { env, fetchFn: answer },
      ID,
      SWAP,
    );
    expect(call(answer).url).toBe(
      `https://api.ajo.example/api/v1/groups/${ID}/swaps/${SWAP}/answer`,
    );
    expect(JSON.parse(call(answer).init.body as string)).toEqual({ accept: true });
    const none = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handleAnswerSwap(
          await req("POST", { accept: true }),
          { env, fetchFn: none },
          ID,
          "../x",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleProposeSwap(
          await req("POST", { username: "a_b" }, {}, "cross-site"),
          { env, fetchFn: none },
          ID,
        )
      ).status,
    ).toBe(403);
    expect(none).not.toHaveBeenCalled();
  });
});
