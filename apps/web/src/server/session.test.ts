// @vitest-environment node
import { openSeal, seal, sessionCookie } from "./session";

const secret = "x".repeat(40);

describe("sealed session", () => {
  it("round-trips data and is unreadable without the secret", async () => {
    const sealed = await seal({ accessToken: "a", refreshToken: "r" }, secret, 60);
    expect(sealed).not.toContain("refreshToken");
    expect(await openSeal(sealed, secret)).toEqual({ accessToken: "a", refreshToken: "r" });
    expect(await openSeal(sealed, "y".repeat(40))).toBeNull();
  });

  it("returns null for garbage or a missing cookie", async () => {
    expect(await openSeal("garbage", secret)).toBeNull();
    expect(await openSeal(undefined, secret)).toBeNull();
  });
});

describe("sessionCookie", () => {
  it("is httpOnly, SameSite=strict and host-only in production", () => {
    const cookie = sessionCookie(true);
    expect(cookie.name).toBe("__Host-ajo_session");
    expect(cookie.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/" });
    expect(cookie.options).not.toHaveProperty("domain");
  });

  it("works over http on a developer's machine", () => {
    const cookie = sessionCookie(false);
    expect(cookie.name).toBe("ajo_session");
    expect(cookie.options.secure).toBe(false);
  });
});
