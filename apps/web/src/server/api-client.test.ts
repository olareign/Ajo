// @vitest-environment node
import { callApi, COLD_START_TIMEOUT_MS, UNREACHABLE, type Fetch } from "./api-client";
import { loadServerEnv } from "./env";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});

afterEach(() => vi.restoreAllMocks());

describe("callApi", () => {
  it("sends only what it is given, to the versioned API path", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({ ok: true }));
    const result = await callApi(env, fetchFn, {
      path: "/auth/login",
      body: { email: "a@b.co" },
      accessToken: "tok",
    });
    expect(result).toEqual({ status: 200, data: { ok: true } });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/login");
    expect(Object.keys(init!.headers as object).sort()).toEqual([
      "Accept",
      "Authorization",
      "Content-Type",
    ]);
  });

  it("turns a network failure into a plain 502 for the person", async () => {
    const fetchFn = vi.fn<Fetch>(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await callApi(env, fetchFn, { path: "/auth/login" })).toEqual({
      status: 502,
      data: { message: UNREACHABLE },
    });
  });

  it("waits 10 seconds by default", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await callApi(
      env,
      vi.fn<Fetch>(async () => Response.json({})),
      { path: "/health" },
    );
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it("can wait long enough for a sleeping server to wake up", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await callApi(
      env,
      vi.fn<Fetch>(async () => Response.json({})),
      { path: "/auth/login", patient: true },
    );
    expect(timeout).toHaveBeenCalledWith(COLD_START_TIMEOUT_MS);
    expect(COLD_START_TIMEOUT_MS).toBeGreaterThan(30_000);
  });
});
