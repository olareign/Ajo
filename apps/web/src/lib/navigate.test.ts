import { leaveFor } from "./navigate";

const assign = vi.fn();
beforeEach(() => {
  vi.stubGlobal("location", { assign });
});
afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
});

describe("leaving for the partner's page", () => {
  it("follows a secure address", () => {
    expect(leaveFor("https://checkout.paystack.com/abc")).toBe(true);
    expect(assign).toHaveBeenCalledWith("https://checkout.paystack.com/abc");
  });

  it.each([
    "http://checkout.example/x",
    "javascript:alert(1)",
    "data:text/html,hi",
    "not a url",
    "",
  ])("refuses %j", (url) => {
    expect(leaveFor(url)).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
