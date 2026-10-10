import { FACTS, FIRST_QUESTIONS, type Faq } from "@/components/public/facts";

export type HelpTopic = Readonly<{ id: string; title: string; questions: readonly Faq[] }>;

/** Help, grouped the way people arrive with a problem. Every answer matches what the app does. */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "circles",
    title: "Circles",
    questions: [
      FIRST_QUESTIONS[0]!,
      {
        q: "How big can a circle be, and how often does it pay?",
        a: `Between ${FACTS.circleSize.min} and ${FACTS.circleSize.max} people. It pays out weekly, every two weeks or monthly, and there are as many rounds as there are people.`,
      },
      {
        q: "Who decides the order?",
        a: "Whoever starts the circle picks how: a draw anyone can check, members choosing their own turn, or the order people joined. Two members can agree to swap turns.",
      },
      FIRST_QUESTIONS[1]!,
      FIRST_QUESTIONS[2]!,
    ],
  },
  {
    id: "money",
    title: "Your money",
    questions: [
      {
        q: "How do I add money?",
        a: "Go to Wallet and tap Add money. In Nigeria you can pay by card, bank transfer or USSD. In the UK you pay by card.",
      },
      FIRST_QUESTIONS[4]!,
      {
        q: "A payment is missing or looks wrong",
        a: "Check its status in Wallet first; some payments take a few minutes to confirm. If it still looks wrong, email us with the date and the amount. Never send us your password, PIN or codes.",
      },
      FIRST_QUESTIONS[3]!,
    ],
  },
  {
    id: "account",
    title: "Your account",
    questions: [
      {
        q: "I lost my phone, or think someone got in",
        a: "Sign in on another device, go to Me, then Sign out of all devices, and change your password. Security activity on Me lists every sign-in and change, so you can see what happened.",
      },
      {
        q: "I forgot my transaction PIN",
        a: "Go to Me, then Transaction PIN, and choose Reset. You'll need your password, and the code from your authenticator app if it's on.",
      },
      {
        q: "How do I raise my limits?",
        a: "Limits rise as you verify who you are. Go to Me and tap Raise your level, or see every level under Wallet, then Your limits.",
      },
      {
        q: "How do I close my account?",
        a: "Empty your wallet, end any saving plans, wait for your circles to finish and cancel auto-debit. Then go to Me, tap Close account, and confirm with your password (and your authenticator code, if it's on).",
      },
    ],
  },
];
