import { readFileSync } from "node:fs";
import { join } from "node:path";

// Promises the app can't keep. If one comes back, a person reading the page is being told something
// untrue about their money. Deposits cover a missed share only for members who lock one, so nothing
// here may say payouts are guaranteed.
const BANNED = [
  /guarantee(d|s)?\b(?! Shield)/i,
  /100% (payout|guarant|on-time|full)/i,
  /biometric/i,
  /24\/7/,
  /all systems operational/i,
  /bank-grade/i,
  /zero (default|risk|payout)/i,
  /cryptographic/i,
  /faster payments/i,
  /Àjọ Technologies/,
  /licensed|regulated|custodial|ring-fenced/i,
  /< ?2 hours|&lt; 2 hours/,
  /Ada O\./,
  /4-digit/,
];

const FILES = [
  "components/Landing.tsx",
  "components/auth/AuthScreen.tsx",
  "components/help/PublicHelpCenter.tsx",
  "components/landing/LandingFooter.tsx",
  "components/landing/LandingHeader.tsx",
  "components/landing/DesktopDashboardMockup.tsx",
  "components/landing/InteractiveCircleSimulator.tsx",
  "app/about/page.tsx",
  "app/safety/page.tsx",
  "app/how-it-works/page.tsx",
];

describe("the public pages' claims", () => {
  it.each(FILES)("%s promises nothing the app can't keep", (file) => {
    const text = readFileSync(join(process.cwd(), "src", file), "utf8");
    for (const phrase of BANNED) expect(text).not.toMatch(phrase);
  });
});
