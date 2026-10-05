import { postJson } from "@/components/auth/post-json";
import { send } from "./api-send";
import { loadScreen } from "./screen-client";
import { forgetAll, recall, remember } from "./visit-cache";

afterEach(() => vi.unstubAllGlobals());
const answer = (status: number, body: object = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );

describe("what a visit remembers", () => {
  it("is kept across screens and read back as it was", () => {
    remember("screen:wallet", { balance: 1 });
    expect(recall("screen:wallet")).toEqual({ balance: 1 });
    forgetAll();
    expect(recall("screen:wallet")).toBeUndefined();
  });

  it("is forgotten as soon as the person changes anything, before the change is sent", async () => {
    remember("screen:wallet", { balance: 1 });
    let seenDuringRequest: unknown = "not called";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        seenDuringRequest = recall("screen:wallet");
        return Response.json({});
      }),
    );
    await send("POST", "/api/payments/fund", { body: { amount: "1" } });
    expect(seenDuringRequest).toBeUndefined();
  });

  it("survives a plain read", async () => {
    remember("screen:wallet", { balance: 1 });
    answer(200, { ok: true });
    await send("GET", "/api/savings");
    expect(recall("screen:wallet")).toEqual({ balance: 1 });
  });

  it("is forgotten when the session has ended, by any route", async () => {
    remember("me", { displayName: "Ada" });
    answer(401);
    await send("GET", "/api/savings");
    expect(recall("me")).toBeUndefined();

    remember("me", { displayName: "Ada" });
    answer(401);
    await loadScreen("today");
    expect(recall("me")).toBeUndefined();
  });

  it("is forgotten on signing in or out, so one person never sees another's screens", async () => {
    remember("me", { displayName: "Ada" });
    answer(200);
    await postJson("/api/auth/sign-in", { email: "b@c.co", password: "x" });
    expect(recall("me")).toBeUndefined();
  });

  it("is not forgotten by a wrong code, which is not the end of the session", async () => {
    remember("me", { displayName: "Ada" });
    answer(401, { message: "Wrong code.", code: "mfa_invalid" });
    await send("GET", "/api/me");
    expect(recall("me")).toEqual({ displayName: "Ada" });
  });
});
