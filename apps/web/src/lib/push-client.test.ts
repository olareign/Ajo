import { keyBytes } from "./push-client";

describe("keyBytes", () => {
  it("turns the server's base64url key into the bytes a browser subscribes with", () => {
    // 65 bytes: an uncompressed P-256 point, as a VAPID public key is.
    const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i * 7 + 4) % 256);
    bytes[0] = 4;
    const encoded = Buffer.from(bytes).toString("base64url");
    expect(encoded).toHaveLength(87);
    expect(Array.from(keyBytes(encoded))).toEqual(Array.from(bytes));
  });

  it("copes with the - and _ of base64url", () => {
    expect(Array.from(keyBytes("-_8"))).toEqual([0xfb, 0xff]);
  });
});
