// @vitest-environment node
import { clientOf } from "./client-context";

const request = (headers: Record<string, string>) =>
  new Request("https://app.ajo.example/x", { headers });

describe("clientOf", () => {
  it("reads the visitor's address and device from what Vercel adds to the request", () => {
    expect(
      clientOf(
        request({ "x-forwarded-for": "102.89.34.7", "user-agent": "Mozilla/5.0 Chrome/130" }),
      ),
    ).toEqual({ ip: "102.89.34.7", userAgent: "Mozilla/5.0 Chrome/130" });
  });

  it("prefers x-real-ip, and takes only the first address of a list", () => {
    expect(clientOf(request({ "x-real-ip": "41.58.2.9", "x-forwarded-for": "1.1.1.1" })).ip).toBe(
      "41.58.2.9",
    );
    expect(clientOf(request({ "x-forwarded-for": "102.89.34.7, 76.76.21.21" })).ip).toBe(
      "102.89.34.7",
    );
  });

  it("accepts an IPv6 address", () => {
    expect(clientOf(request({ "x-real-ip": "2a00:23c8:1::7" })).ip).toBe("2a00:23c8:1::7");
  });

  it.each(["not-an-ip", "1.2.3.4/../x", "<script>", "999.1.1.1"])(
    "drops %s as an address",
    (junk) => {
      expect(clientOf(request({ "x-real-ip": junk })).ip).toBeUndefined();
    },
  );

  it("has nothing to say when nothing is there (local development)", () => {
    expect(clientOf(request({}))).toEqual({});
  });

  it("caps the device description", () => {
    expect(clientOf(request({ "user-agent": "A".repeat(2000) })).userAgent).toHaveLength(512);
  });
});
