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

  describe("naming the person behind a call", () => {
    const withSecret = loadServerEnv({
      NODE_ENV: "production",
      API_BASE_URL: "https://api.ajo.example",
      SESSION_SECRET: "k".repeat(40),
      BFF_SHARED_SECRET: "b".repeat(48),
    });
    const sent = async (e: typeof env, client?: { ip?: string; userAgent?: string }) => {
      const fetchFn = vi.fn<Fetch>(async () => Response.json({}));
      await callApi(e, fetchFn, { path: "/auth/login", client });
      return new Headers(fetchFn.mock.calls[0]![1]!.headers);
    };

    it("tells the API the visitor's address and device, proving it is us with the shared secret", async () => {
      const headers = await sent(withSecret, { ip: "102.89.34.7", userAgent: "Chrome on Android" });
      expect(headers.get("x-ajo-bff-secret")).toBe("b".repeat(48));
      expect(headers.get("x-ajo-client-ip")).toBe("102.89.34.7");
      expect(headers.get("x-ajo-client-ua")).toBe("Chrome on Android");
    });

    it("sends nothing of the kind when no secret is configured", async () => {
      const headers = await sent(env, { ip: "102.89.34.7", userAgent: "Chrome" });
      expect([...headers.keys()].filter((h) => h.startsWith("x-ajo-"))).toEqual([]);
    });

    it("does not send the secret for a call that has nothing to say about a visitor", async () => {
      const headers = await sent(withSecret, {});
      expect([...headers.keys()].filter((h) => h.startsWith("x-ajo-"))).toEqual([]);
      expect([...(await sent(withSecret)).keys()].filter((h) => h.startsWith("x-ajo-"))).toEqual(
        [],
      );
    });
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
