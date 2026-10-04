// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { handleKyc, handleRails } from "./kyc-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});

async function get(path: string, signedIn = true) {
  const headers: Record<string, string> = {};
  if (signedIn) {
    const sealed = await seal(
      { accessToken: "old-access", refreshToken: "old-refresh" },
      env.sessionSecret,
      3600,
    );
    headers.Cookie = `__Host-ajo_session=${encodeURIComponent(sealed)}`;
  }
  return new Request(`https://app.ajo.example${path}`, { headers });
}

describe("verification and payment status", () => {
  it("asks the API for the person's own progress, as the person", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({ status: "not_started" }));
    const res = await handleKyc(await get("/api/kyc"), { env, fetchFn });
    expect(await res.json()).toEqual({ status: "not_started" });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/kyc");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer old-access");
  });

  it("does the same for what money can do", async () => {
    const fetchFn = vi.fn<Fetch>(async () => Response.json({ currency: "NGN" }));
    await handleRails(await get("/api/wallet/rails"), { env, fetchFn });
    expect(fetchFn.mock.calls[0]![0]).toBe("https://api.ajo.example/api/v1/wallet/rails");
  });

  it("is 401 without a session and never calls the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    expect((await handleKyc(await get("/api/kyc", false), { env, fetchFn })).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
