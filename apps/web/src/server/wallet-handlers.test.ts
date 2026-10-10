// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { seal } from "./session";
import {
  handleInsights,
  handleStatement,
  handleTransactions,
  handleWallet,
} from "./wallet-handlers";

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
const ok = (body: unknown) => Response.json(body, { status: 200 });

describe("wallet balances", () => {
  it("asks the API for the signed-in person's wallet and passes the answer on", async () => {
    const wallets = { wallets: [{ currency: "NGN" }] };
    const fetchFn = vi.fn<Fetch>(async () => ok(wallets));
    const res = await handleWallet(await get("/api/wallet"), { env, fetchFn });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(wallets);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/wallet");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer old-access");
  });

  it("is 401 without a session, and never calls the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    const res = await handleWallet(await get("/api/wallet", false), { env, fetchFn });
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("wallet history", () => {
  const history = { items: [], next: null };

  it("sends no query when none is given", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(history));
    await handleTransactions(await get("/api/wallet/transactions"), { env, fetchFn });
    expect(fetchFn.mock.calls[0]![0]).toBe("https://api.ajo.example/api/v1/wallet/transactions");
  });

  it("passes on the page size and the cursor", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(history));
    await handleTransactions(await get("/api/wallet/transactions?limit=20&before=4521"), {
      env,
      fetchFn,
    });
    expect(fetchFn.mock.calls[0]![0]).toBe(
      "https://api.ajo.example/api/v1/wallet/transactions?limit=20&before=4521",
    );
  });

  it("forwards nothing but the two known parameters", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(history));
    await handleTransactions(
      await get("/api/wallet/transactions?limit=5&userId=someone-else&before=9&owner=x"),
      { env, fetchFn },
    );
    expect(fetchFn.mock.calls[0]![0]).toBe(
      "https://api.ajo.example/api/v1/wallet/transactions?limit=5&before=9",
    );
  });

  it.each([
    ["a page size of zero", "limit=0"],
    ["a page size over 100", "limit=101"],
    ["a page size that is not a number", "limit=ten"],
    ["a cursor that is not digits", "before=1%20OR%201%3D1"],
    ["a cursor that is too long", `before=${"9".repeat(19)}`],
  ])("refuses %s without calling the API", async (_name, query) => {
    const fetchFn = vi.fn<Fetch>();
    const res = await handleTransactions(await get(`/api/wallet/transactions?${query}`), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("is 401 without a session, and never calls the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    const res = await handleTransactions(await get("/api/wallet/transactions", false), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("statements and insights", () => {
  it("passes only two well-formed dates on, and refuses anything else without asking the API", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok({ lines: [] }));
    await handleStatement(await get("/api/wallet/statement?from=2026-09-01&to=2026-09-30&x=1"), {
      env,
      fetchFn,
    });
    expect(fetchFn.mock.calls[0]![0]).toBe(
      "https://api.ajo.example/api/v1/wallet/statement?from=2026-09-01&to=2026-09-30",
    );
    const refused = vi.fn<Fetch>();
    for (const q of [
      "",
      "?from=2026-09-01",
      "?from=yesterday&to=today",
      "?from=2026-13-01&to=2026-09-30",
      "?from=2026-09-01&to=2026-09-30%26admin=1",
    ]) {
      expect(
        (await handleStatement(await get(`/api/wallet/statement${q}`), { env, fetchFn: refused }))
          .status,
      ).toBe(400);
    }
    expect(refused).not.toHaveBeenCalled();
  });

  it("asks for 12 months unless told, and only between 1 and 24", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok({ months: [] }));
    await handleInsights(await get("/api/wallet/insights"), { env, fetchFn });
    await handleInsights(await get("/api/wallet/insights?months=6"), { env, fetchFn });
    expect(fetchFn.mock.calls.map(([u]) => u)).toEqual([
      "https://api.ajo.example/api/v1/wallet/insights?months=12",
      "https://api.ajo.example/api/v1/wallet/insights?months=6",
    ]);
    const refused = vi.fn<Fetch>();
    for (const m of ["0", "25", "abc", "-1", "6.5"]) {
      expect(
        (
          await handleInsights(await get(`/api/wallet/insights?months=${m}`), {
            env,
            fetchFn: refused,
          })
        ).status,
      ).toBe(400);
    }
    expect(refused).not.toHaveBeenCalled();
  });

  it("is 401 without a session", async () => {
    const fetchFn = vi.fn<Fetch>();
    expect(
      (
        await handleStatement(
          await get("/api/wallet/statement?from=2026-09-01&to=2026-09-30", false),
          { env, fetchFn },
        )
      ).status,
    ).toBe(401);
    expect(
      (await handleInsights(await get("/api/wallet/insights", false), { env, fetchFn })).status,
    ).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
