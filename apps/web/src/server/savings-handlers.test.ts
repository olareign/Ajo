// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleCreatePlan,
  handlePlan,
  handlePlanAction,
  handleSavingsList,
  handleSavingsPreview,
  isPlanAction,
} from "./savings-handlers";
import { handleNotifications, handleRead, handleReadAll } from "./notifications-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";
const KEY = "k_0123456789abcdef";
const ID = "3f0c8a52-1d4e-4c7a-9b0e-6a2f5d8c1e47";
const PLAN = {
  name: "Rent",
  amount: "500000",
  frequency: "weekly",
  totalDebits: 4,
  startDate: "2026-11-01",
  topupFromBank: true,
};

async function req(
  method: string,
  body?: unknown,
  extra: Record<string, string> = {},
  site = "same-origin",
  url = "/api/x",
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

describe("making a plan", () => {
  it("passes on the plan's own fields and the safety key, and nothing else", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(201, { id: ID }));
    const res = await handleCreatePlan(
      await req(
        "POST",
        { ...PLAN, userId: "someone-else" },
        { "Idempotency-Key": KEY, "X-Forwarded-For": "6.6.6.6" },
      ),
      { env, fetchFn },
    );
    expect(res.status).toBe(201);
    const c = call(fetchFn);
    expect(c.url).toBe("https://api.ajo.example/api/v1/savings");
    expect(JSON.parse(c.init.body as string)).toEqual(PLAN);
    expect(c.headers.get("Idempotency-Key")).toBe(KEY);
    expect(c.headers.get("X-Forwarded-For")).toBeNull();
  });

  it("refuses without a safety key, or from another site, and calls nothing", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(201));
    expect((await handleCreatePlan(await req("POST", PLAN), { env, fetchFn })).status).toBe(400);
    expect(
      (
        await handleCreatePlan(await req("POST", PLAN, { "Idempotency-Key": KEY }, "cross-site"), {
          env,
          fetchFn,
        })
      ).status,
    ).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("previews without a key, and reads the list", async () => {
    const preview = vi.fn<Fetch>(async () => reply(200, { dates: [] }));
    await handleSavingsPreview(await req("POST", PLAN), { env, fetchFn: preview });
    expect(call(preview).url).toBe("https://api.ajo.example/api/v1/savings/preview");
    const list = vi.fn<Fetch>(async () => reply(200, { plans: [] }));
    await handleSavingsList(await req("GET"), { env, fetchFn: list });
    expect(call(list).url).toBe("https://api.ajo.example/api/v1/savings");
  });
});

describe("one plan", () => {
  it("looks one up only by a well-formed id", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { id: ID }));
    await handlePlan(await req("GET"), { env, fetchFn }, ID);
    expect(call(fetchFn).url).toBe(`https://api.ajo.example/api/v1/savings/${ID}`);
    for (const bad of ["preview", "../me", `${ID}/pause`]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      expect((await handlePlan(await req("GET"), { env, fetchFn: none }, bad)).status).toBe(404);
      expect(none).not.toHaveBeenCalled();
    }
  });

  it("knows its four actions and no others", () => {
    expect(["pause", "resume", "topup", "withdraw"].every(isPlanAction)).toBe(true);
    expect(isPlanAction("delete")).toBe(false);
    expect(isPlanAction("constructor")).toBe(false);
  });

  it("pauses and resumes with no body, tops up with a key, and ends early with the PIN in the body", async () => {
    const pause = vi.fn<Fetch>(async () => reply(200));
    await handlePlanAction(await req("POST"), { env, fetchFn: pause }, ID, "pause");
    expect(call(pause).url).toBe(`https://api.ajo.example/api/v1/savings/${ID}/pause`);
    expect(call(pause).init.body).toBeUndefined();

    const topup = vi.fn<Fetch>(async () => reply(200));
    await handlePlanAction(
      await req("POST", { amount: "300000", extra: "x" }, { "Idempotency-Key": KEY }),
      { env, fetchFn: topup },
      ID,
      "topup",
    );
    expect(JSON.parse(call(topup).init.body as string)).toEqual({ amount: "300000" });
    expect(call(topup).headers.get("Idempotency-Key")).toBe(KEY);
    const noKey = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handlePlanAction(
          await req("POST", { amount: "300000" }),
          { env, fetchFn: noKey },
          ID,
          "topup",
        )
      ).status,
    ).toBe(400);
    expect(noKey).not.toHaveBeenCalled();

    const withdraw = vi.fn<Fetch>(async () => reply(200));
    await handlePlanAction(
      await req("POST", { pin: "493817" }),
      { env, fetchFn: withdraw },
      ID,
      "withdraw",
    );
    expect(JSON.parse(call(withdraw).init.body as string)).toEqual({ pin: "493817" });
    expect(call(withdraw).url).not.toContain("493817");
  });

  it("refuses an action from another site", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handlePlanAction(
          await req("POST", undefined, {}, "cross-site"),
          { env, fetchFn },
          ID,
          "pause",
        )
      ).status,
    ).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("messages", () => {
  it("passes on only a well-formed page size and place", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { items: [] }));
    await handleNotifications(
      await req("GET", undefined, {}, "same-origin", "/api/notifications?limit=20&before=123&x=1"),
      { env, fetchFn },
    );
    expect(call(fetchFn).url).toBe(
      "https://api.ajo.example/api/v1/notifications?limit=20&before=123",
    );
    for (const bad of ["limit=0", "limit=500", "limit=abc", "before=abc", "before=1;2"]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      const res = await handleNotifications(
        await req("GET", undefined, {}, "same-origin", `/api/notifications?${bad}`),
        { env, fetchFn: none },
      );
      expect(res.status).toBe(400);
      expect(none).not.toHaveBeenCalled();
    }
  });

  it("marks one or all as read, from this app only, and only a well-formed id", async () => {
    const one = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));
    await handleRead(await req("POST"), { env, fetchFn: one }, ID);
    expect(call(one).url).toBe(`https://api.ajo.example/api/v1/notifications/${ID}/read`);
    const all = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));
    await handleReadAll(await req("POST"), { env, fetchFn: all });
    expect(call(all).url).toBe("https://api.ajo.example/api/v1/notifications/read-all");
    const blocked = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handleReadAll(await req("POST", undefined, {}, "cross-site"), {
          env,
          fetchFn: blocked,
        })
      ).status,
    ).toBe(403);
    expect((await handleRead(await req("POST"), { env, fetchFn: blocked }, "nope")).status).toBe(
      404,
    );
    expect(blocked).not.toHaveBeenCalled();
  });
});
