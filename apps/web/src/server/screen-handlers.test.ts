// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { handleScreen, SCREENS } from "./screen-handlers";
import { openSeal, seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});

async function req(signedIn = true) {
  const headers: Record<string, string> = {};
  if (signedIn) {
    const sealed = await seal(
      { accessToken: "old-access", refreshToken: "old-refresh" },
      env.sessionSecret,
      3600,
    );
    headers.Cookie = `__Host-ajo_session=${encodeURIComponent(sealed)}`;
  }
  return new Request("https://app.ajo.example/api/screens/wallet", { headers });
}
const pathOf = (url: string) => url.replace("https://api.ajo.example/api/v1", "");
const tokenOf = (init?: RequestInit) =>
  (init?.headers as Record<string, string>).Authorization?.replace("Bearer ", "");

describe("a screen's data in one reply", () => {
  it("asks for every part at once and returns each part's own answer", async () => {
    let inFlight = 0;
    let most = 0;
    const fetchFn = vi.fn<Fetch>(async (url) => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return pathOf(url) === "/wallet"
        ? Response.json({ wallets: [] })
        : Response.json(
            { message: "Finish your passport first.", code: "kyc_required" },
            { status: 403 },
          );
    });
    const res = await handleScreen(await req(), { env, fetchFn }, "wallet");
    expect(res.status).toBe(200);
    expect(most).toBe(2);
    expect(fetchFn.mock.calls.map(([u]) => pathOf(u)).sort()).toEqual(
      Object.values(SCREENS.wallet).sort(),
    );
    expect(await res.json()).toEqual({
      wallets: { status: 200, data: { wallets: [] } },
      transactions: {
        status: 403,
        data: { message: "Finish your passport first.", code: "kyc_required" },
      },
    });
  });

  it("refreshes an expired session once, asks again only what was turned away, and stores the new session", async () => {
    const fetchFn = vi.fn<Fetch>(async (url, init) => {
      const path = pathOf(url);
      if (path === "/auth/refresh")
        return Response.json({ accessToken: "new-access", refreshToken: "new-refresh" });
      if (tokenOf(init) === "old-access" && path.startsWith("/wallet/transactions"))
        return Response.json({ message: "expired" }, { status: 401 });
      return Response.json({ path, token: tokenOf(init) });
    });
    const res = await handleScreen(await req(), { env, fetchFn }, "wallet");
    expect(res.status).toBe(200);
    const paths = fetchFn.mock.calls.map(([u]) => pathOf(u));
    expect(paths.filter((p) => p === "/auth/refresh")).toHaveLength(1);
    expect(paths.filter((p) => p === "/wallet")).toHaveLength(1);
    const body = await res.json();
    expect(body.transactions.data.token).toBe("new-access");
    const cookie = res.headers.get("Set-Cookie")!;
    const sealed = decodeURIComponent(cookie.split(";")[0]!.split("=").slice(1).join("="));
    expect(await openSeal(sealed, env.sessionSecret)).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("ends the session when the refresh is refused", async () => {
    const fetchFn = vi.fn<Fetch>(async (url) =>
      pathOf(url) === "/auth/refresh"
        ? Response.json({ message: "no" }, { status: 401 })
        : Response.json({ message: "expired" }, { status: 401 }),
    );
    const res = await handleScreen(await req(), { env, fetchFn }, "wallet");
    expect(res.status).toBe(401);
    expect(res.headers.get("Set-Cookie")).toMatch(/Max-Age=0/);
  });

  it("does not treat a refused code as an expired session", async () => {
    const fetchFn = vi.fn<Fetch>(async () =>
      Response.json({ message: "Wrong code.", code: "mfa_invalid" }, { status: 401 }),
    );
    const res = await handleScreen(await req(), { env, fetchFn }, "wallet");
    expect(res.status).toBe(200);
    expect(fetchFn.mock.calls.some(([u]) => pathOf(u) === "/auth/refresh")).toBe(false);
  });

  it("answers 401 without a session and 404 for a screen it does not know, without calling the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    expect((await handleScreen(await req(false), { env, fetchFn }, "wallet")).status).toBe(401);
    expect((await handleScreen(await req(), { env, fetchFn }, "../admin")).status).toBe(404);
    expect((await handleScreen(await req(), { env, fetchFn }, "toString")).status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
