import type { Country, CountryConfig } from "@/lib/kyc-config";

export type Outcome = Readonly<{ ok: true }> | Readonly<{ ok: false; message: string }>;

/** What every step screen is given: who the person is, their country's rules, and how to send. */
export type StepProps = Readonly<{
  country: Country;
  config: CountryConfig;
  holder: string;
  /** Sends what the person entered. The screen above decides what that does (in a preview: nothing real). */
  submit: (input: Readonly<{ number?: string; file?: string }>) => Promise<Outcome>;
  /** Asks the bank who owns an account (the payment partner's job; in a preview, a made-up answer). */
  resolveName: (number: string) => Promise<string>;
}>;
