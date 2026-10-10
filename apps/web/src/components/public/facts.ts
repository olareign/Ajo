/**
 * What the public pages promise, in one place, checked against the API's rules (Oct 10, 2026):
 * groups.dto.ts (size 3 to 30; weekly, every two weeks or monthly; draw, pick or join order),
 * savings.dto.ts (daily, weekly or monthly; 2 to 366 payments), env defaults GROUP_GRACE_DAYS=2,
 * GROUP_DEPOSIT_BASE_X=1, GROUP_DEPOSIT_EARLY_X=3, DEFAULTER_BLOCK_DAYS=90, early turns = the first
 * third. If one of those changes, change it here and every page follows.
 */
export const FACTS = {
  circleSize: { min: 3, max: 30 },
  graceDays: 2,
  pauseDays: 90,
  countries: "Nigeria and the UK",
} as const;

export type Faq = Readonly<{ q: string; a: string }>;

/** The questions people ask first. The Help page has these and more. */
export const FIRST_QUESTIONS: readonly Faq[] = [
  {
    q: "What is an èsúsú circle?",
    a: "A few people agree to pay the same amount on the same days. Each round, one of them takes the whole pot, until everyone has had a turn. Families and market women have run them for generations; Àjọ keeps the notebook, the reminders and the money.",
  },
  {
    q: "What if someone doesn't pay?",
    a: `We try their wallet again each day for ${FACTS.graceDays} days and tell them. If it's still not there, their deposit pays their share so the round can go ahead, their record shows the miss, and they can't join or start a circle for ${FACTS.pauseDays} days. Our team then follows up on what they owe. People with a good record don't put a deposit down, so if one of them misses, that round pays what came in while we chase the rest.`,
  },
  {
    q: "Do I have to pay a deposit?",
    a: "Only until you've built a record. Someone new puts down one round's payment, a bit more for an early turn, and gets it back when the circle ends. You see the exact amount before you join.",
  },
  {
    q: "Can I save on my own?",
    a: "Yes. A saving plan takes a set amount daily, weekly or monthly into a pot you can watch fill, and pays it all back to your wallet at the end. You can pause it or top it up.",
  },
  {
    q: "How do I get my money out?",
    a: "From your wallet to your bank account, with your PIN and a fresh code from your authenticator app, so a stolen password alone can't move your money. Withdrawals to UK banks aren't switched on yet.",
  },
];

/** What happens, day by day, when a member's share isn't there on the day. */
export const MISSED = [
  {
    when: "Payment day",
    what: "Everyone's share comes out of their Àjọ wallet. If they've set up auto-debit, their bank tops up a short wallet first.",
  },
  {
    when: `Days 1–${FACTS.graceDays}`,
    what: "If a wallet is still short, we try again each day and let them know.",
  },
  {
    when: `Day ${FACTS.graceDays + 1}`,
    what: "Their deposit pays their share, so the round goes ahead and the person whose turn it is gets paid. Members with a good record don't put a deposit down; if one of them misses, the round pays what came in and we chase the rest.",
  },
  {
    when: "After that",
    what: `The miss stays on their record, they can't join or start a circle for ${FACTS.pauseDays} days, and our team follows up on what they owe.`,
  },
] as const;
