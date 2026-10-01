import { messageOf } from "./post-json";

const result = (status: number, data: Record<string, unknown>) => ({
  ok: status < 400,
  status,
  data,
});

describe("messageOf", () => {
  it("uses the API's own message when it is plain text", () => {
    expect(messageOf(result(401, { message: "Email or password is incorrect." }))).toBe(
      "Email or password is incorrect.",
    );
  });

  it("never shows raw validation lists to a person", () => {
    expect(messageOf(result(400, { message: ["displayName must be a string"] }))).toBe(
      "Check what you entered and try again.",
    );
  });

  it("falls back to a calm general message", () => {
    expect(messageOf(result(500, {}))).toBe("Something went wrong. Please try again.");
  });

  it.each([
    ["too_short", "Use at least 12 characters. A few words strung together works well."],
    ["too_long", "That's longer than 128 characters. Try a shorter phrase."],
    ["contains_email", "Your password shouldn't contain the first part of your email."],
    ["breached", "That password has appeared in a data breach. Choose a different one."],
  ])("explains a %s password in plain words", (code, text) => {
    expect(
      messageOf(
        result(400, {
          message: "Password does not meet the requirements",
          details: { password: [code] },
        }),
      ),
    ).toBe(text);
  });
});
