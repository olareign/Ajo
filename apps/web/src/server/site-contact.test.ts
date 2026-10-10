import { DEFAULT_SUPPORT_EMAIL, isPlainEmail, supportMailto } from "@/lib/support";
import { CONTACT_REVALIDATE_SECONDS, readSupportEmail } from "./site-contact";

vi.mock("server-only", () => ({}));

const answer = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status }));

describe("the support email", () => {
  it("is what staff set, read from the API and cached for a minute", async () => {
    const fetchFn = answer({ supportEmail: "help@ajo.com" });
    expect(await readSupportEmail(fetchFn)).toBe("help@ajo.com");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit & { next: { revalidate: number } },
    ];
    expect(url).toBe("http://localhost:4000/api/v1/site/contact");
    expect(init.next.revalidate).toBe(CONTACT_REVALIDATE_SECONDS);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["the API is down", vi.fn(async () => Promise.reject(new Error("ECONNREFUSED")))],
    ["the API errors", answer({ message: "x" }, 500)],
    ["the answer has no address", answer({})],
    ["the address isn't plain", answer({ supportEmail: "Help <help@ajo.com>" })],
    [
      "the address could add mail headers",
      answer({ supportEmail: "a@ajo.com\r\nBcc: x@evil.example" }),
    ],
    ["the answer isn't JSON", vi.fn(async () => new Response("<html>"))],
  ])("falls back to the default when %s", async (_why, fetchFn) => {
    expect(await readSupportEmail(fetchFn)).toBe(DEFAULT_SUPPORT_EMAIL);
  });

  it("is info@ajo.com by default", () => {
    expect(DEFAULT_SUPPORT_EMAIL).toBe("info@ajo.com");
  });

  it("accepts only plain addresses, and builds a mail link with an encoded subject", () => {
    expect(isPlainEmail("help@ajo.com")).toBe(true);
    for (const bad of ["help", "help@ajo", "a b@ajo.com", "<a@ajo.com>", "a@ajo.com,b@ajo.com", 42])
      expect(isPlainEmail(bad)).toBe(false);
    expect(supportMailto("help@ajo.com", "Àjọ help")).toBe(
      "mailto:help@ajo.com?subject=%C3%80j%E1%BB%8D%20help",
    );
  });
});
