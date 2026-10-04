import type { StepKey } from "./kyc";

export type Country = "NG" | "GB";

export type IdType = Readonly<{
  value: string;
  title: string;
  detail: string;
  label: string;
  hint: string;
  pattern: RegExp;
}>;

export type Bank = Readonly<{ code: string; name: string }>;

export type CountryConfig = Readonly<{
  name: string;
  currency: "NGN" | "GBP";
  locale: string;
  idTypes: readonly IdType[];
  addressDocuments: readonly { value: string; title: string }[];
  bank: Readonly<{ kind: "ng"; banks: readonly Bank[] }> | Readonly<{ kind: "uk" }>;
  /** Where a country offers one, an extra check that raises the tier (BVN in Nigeria). */
  nationalCheck?: Readonly<{ title: string; label: string; detail: string }>;
  /** Shown in the preview only: the area a person would be placed in. */
  sampleArea: string;
}>;

const loose = /^[A-Z0-9]{6,20}$/;

/**
 * What each country accepts. A real partner decides what is genuinely valid; these checks only catch
 * typos before anything is sent. Nigerian bank names here feed the preview: with a payment partner
 * connected, the list comes from that partner.
 */
const CONFIG: Readonly<Record<Country, CountryConfig>> = {
  NG: {
    name: "Nigeria",
    currency: "NGN",
    locale: "en-NG",
    idTypes: [
      {
        value: "nin",
        title: "National ID (NIN)",
        detail: "The 11-digit number on your NIN slip or card",
        label: "NIN",
        hint: "11 digits",
        pattern: /^\d{11}$/,
      },
      {
        value: "passport",
        title: "International passport",
        detail: "From the photo page",
        label: "Passport number",
        hint: "Letters and numbers, as printed",
        pattern: loose,
      },
      {
        value: "drivers_licence",
        title: "Driver's licence",
        detail: "FRSC licence number",
        label: "Licence number",
        hint: "Letters and numbers, as printed",
        pattern: loose,
      },
      {
        value: "voters_card",
        title: "Voter's card",
        detail: "The 19-character VIN",
        label: "Voter number",
        hint: "Letters and numbers, as printed",
        pattern: loose,
      },
    ],
    addressDocuments: [
      { value: "utility_bill", title: "Electricity or water bill" },
      { value: "bank_statement", title: "Bank statement" },
      { value: "tenancy", title: "Tenancy agreement" },
    ],
    bank: {
      kind: "ng",
      banks: [
        { code: "044", name: "Access Bank" },
        { code: "058", name: "GTBank" },
        { code: "011", name: "First Bank" },
        { code: "033", name: "UBA" },
        { code: "057", name: "Zenith Bank" },
        { code: "070", name: "Fidelity Bank" },
        { code: "221", name: "Stanbic IBTC" },
        { code: "232", name: "Sterling Bank" },
        { code: "035", name: "Wema Bank" },
        { code: "032", name: "Union Bank" },
        { code: "076", name: "Polaris Bank" },
        { code: "50211", name: "Kuda" },
        { code: "50515", name: "Moniepoint" },
        { code: "999991", name: "PalmPay" },
        { code: "999992", name: "OPay" },
      ],
    },
    nationalCheck: {
      title: "Add your BVN",
      label: "BVN",
      detail:
        "Your 11-digit Bank Verification Number. Dial *565*0# on the phone number your bank has.",
    },
    sampleArea: "Ikeja, Lagos",
  },
  GB: {
    name: "United Kingdom",
    currency: "GBP",
    locale: "en-GB",
    idTypes: [
      {
        value: "passport",
        title: "Passport",
        detail: "From the photo page",
        label: "Passport number",
        hint: "9 digits",
        pattern: /^\d{9}$/,
      },
      {
        value: "driving_licence",
        title: "Driving licence",
        detail: "Photocard licence number",
        label: "Licence number",
        hint: "16 characters, as printed",
        pattern: /^[A-Z0-9]{16}$/,
      },
      {
        value: "residence_permit",
        title: "Residence permit",
        detail: "BRP or eVisa share code holders",
        label: "Permit number",
        hint: "Letters and numbers, as printed",
        pattern: loose,
      },
    ],
    addressDocuments: [
      { value: "utility_bill", title: "Gas, electric or water bill" },
      { value: "bank_statement", title: "Bank statement" },
      { value: "council_tax", title: "Council tax bill" },
    ],
    bank: { kind: "uk" },
    sampleArea: "Hackney, London",
  },
};

export function countryConfig(country: string | null | undefined): CountryConfig | null {
  return country === "NG" || country === "GB" ? CONFIG[country] : null;
}

const tidy = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export function validateIdNumber(country: Country, type: string, raw: string): boolean {
  const found = CONFIG[country].idTypes.find((t) => t.value === type);
  return found !== undefined && found.pattern.test(tidy(raw));
}

export const validateBvn = (raw: string) => /^\d{11}$/.test(tidy(raw));

export type AccountInput = Readonly<{ bank?: string; sortCode?: string; number: string }>;

export function validateAccount(country: Country, input: AccountInput): boolean {
  const number = tidy(input.number);
  if (country === "NG") return Boolean(input.bank) && /^\d{10}$/.test(number);
  return /^\d{6}$/.test(tidy(input.sortCode ?? "").replace(/-/g, "")) && /^\d{8}$/.test(number);
}

const nameTokens = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * Whether an account's name is the person's own. Order and capitals do not matter, and a bank may hold
 * more or fewer of the names; but at least two names must agree (or the only one there is), so a shared
 * first name alone is not a match.
 */
export function namesMatch(accountName: string, idName: string): boolean {
  const a = new Set(nameTokens(accountName));
  const b = new Set(nameTokens(idName));
  const needed = Math.min(2, a.size, b.size);
  if (needed === 0) return false;
  return [...a].filter((token) => b.has(token)).length >= needed;
}

export const STEP_COPY: Readonly<
  Record<StepKey, { title: string; stamp: string; blurb: string; icon: string }>
> = {
  id: {
    title: "Your ID",
    stamp: "ID",
    blurb: "Prove your name and date of birth.",
    icon: "id",
  },
  selfie: {
    title: "Your face",
    stamp: "FACE",
    blurb: "A quick live selfie, so we know it's you.",
    icon: "face",
  },
  address: {
    title: "Your address",
    stamp: "HOME",
    blurb: "A recent bill or statement with your name on it.",
    icon: "home",
  },
  location: {
    title: "Your area",
    stamp: "AREA",
    blurb: "Share where you are. We only keep the area name.",
    icon: "pin",
  },
  bank: {
    title: "Your bank",
    stamp: "BANK",
    blurb: "The account your money goes back to.",
    icon: "bank",
  },
  national_check: {
    title: "Your BVN",
    stamp: "BVN",
    blurb: "Optional. Raises what you can move.",
    icon: "shield",
  },
};
