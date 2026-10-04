import type { StepKey } from "./kyc";

/** A pause that feels like a partner thinking. Tests replace it with an instant one. */
export const pause = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export const PREVIEW_CHECK_MS = 1400;

/**
 * Sample refusals, so the screen for "that didn't work" can be looked at and tested in a preview:
 * an ID or BVN ending 0000, an account number ending 0000 (another person's name), or a document file called "blurry". Real people never
 * meet these rules; a connected partner decides.
 */
export function previewRefusal(
  step: StepKey,
  input: Readonly<{ number?: string; file?: string }>,
): string | null {
  const ends = (input.number ?? "").replace(/\s/g, "").endsWith("0000");
  if (step === "id" && ends) {
    return "We couldn't match that ID to your name. Check the number and try again.";
  }
  if (step === "national_check" && ends) {
    return "That BVN doesn't match the name on your ID. Check it and try again.";
  }
  if (step === "address" && /blurry/i.test(input.file ?? "")) {
    return "That document was hard to read. Take the photo again in good light, flat on a table.";
  }
  return null;
}

/** What a bank would say the account is called: the person's own name, unless the number ends 0000. */
export function previewAccountName(number: string, holder: string): string {
  return number.replace(/\s/g, "").endsWith("0000") ? "CHIDI OKAFOR" : holder.toUpperCase();
}
