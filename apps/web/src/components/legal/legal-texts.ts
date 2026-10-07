import type { LegalSection } from "./LegalDoc";

/*
 * Plain-language drafts that describe what the app does today. They are not legal advice and must be
 * reviewed by a lawyer in each launch country before `LEGAL.draft` is turned off.
 */

export const TERMS_INTRO =
  "These terms are the agreement between you and Àjọ when you use the app to save on your own, save with a circle (àjọ, esusu) and send money to friends.";

export const TERMS: readonly LegalSection[] = [
  {
    heading: "Who can use Àjọ",
    body: [
      "You must be an adult who can enter a contract where you live, and you may have one account. The details you give us, including your name and identity documents, must be true and your own.",
    ],
  },
  {
    heading: "Your account and its safety",
    body: [
      "Keep your password, transaction PIN and authenticator codes to yourself. We will never ask you for them. Tell us straight away if you think someone else has used your account; you can also sign out of all devices from Me.",
      "You are responsible for what happens in your account until you tell us it was used without your permission.",
    ],
  },
  {
    heading: "Verification and limits",
    body: [
      "Moving money needs your identity checked. How much you can add, save and withdraw depends on your verification level, shown under Wallet, then Your limits. We may ask for more information, and may hold or refuse a payment, where the law or our payment partners require it.",
    ],
  },
  {
    heading: "Your money",
    body: [
      "Àjọ is not a bank. Payments are handled by licensed payment partners, and the money in your wallet, plans and circles is recorded in our ledger, where every entry is kept and none is ever edited.",
      "We do not store card numbers; card payments go straight to the payment partner.",
    ],
  },
  {
    heading: "Saving plans",
    body: [
      "A plan saves the amount you choose on the dates you choose. If you end a locked plan early, any charge for doing so is shown before you confirm.",
    ],
  },
  {
    heading: "Circles",
    body: [
      "A circle is a promise between its members: everyone pays in on each date and each member receives the pot once. Before you join you see the rules: amount, dates, deposit, fees, late fees and grace days. By joining you agree to them.",
      "If you miss a payment, the circle's rules on late fees and deposits apply, and it affects your trust standing with other members.",
    ],
  },
  {
    heading: "What you must not do",
    body: [
      "Do not use Àjọ for fraud, money laundering or any unlawful purpose, to mislead other members, or to get around limits or checks. We may suspend or close an account that does, and report it where the law requires.",
    ],
  },
  {
    heading: "Closing your account",
    body: [
      "You can close your account from Me once your wallet, plans and circles are settled. We can close or suspend an account that breaks these terms, and will tell you why unless the law prevents it.",
    ],
  },
  {
    heading: "Changes and problems",
    body: [
      "We may update these terms and will tell you before important changes take effect. If something goes wrong, contact us first and we will try to put it right.",
    ],
  },
];

export const PRIVACY_INTRO =
  "This notice explains what information Àjọ keeps about you, why, who sees it, and what you can ask us to do with it.";

export const PRIVACY: readonly LegalSection[] = [
  {
    heading: "What we keep",
    body: [
      "Account: your name, email, username, country, saving goal, phone number if you add it, and when you confirmed your email.",
      "Security: a scrambled form of your password and PIN (never the originals), your authenticator setup, and for each sign-in the device type and network address, so you can see them under Devices and Security activity.",
      "Identity checks: what our verification partner returns. ID numbers are encrypted before they are stored.",
      "Money and circles: your wallet, plans, payments, circles, friends and messages in the app.",
    ],
  },
  {
    heading: "Why we use it",
    body: [
      "To run your account and move your money; to keep your account safe and stop fraud; to meet the law on identity checks and money; and to send you messages about your account. We do not sell your information.",
    ],
  },
  {
    heading: "Who else sees it",
    body: [
      "Only the providers we need to run Àjọ: payment partners, identity-check partners, our email service, hosting and database providers, and a bot check at sign-up. When we check a new password against known breaches, only a short fragment of its scrambled form is sent, never the password.",
      "Other members see only what Àjọ shows them: your name, username and trust standing in circles and friends.",
    ],
  },
  {
    heading: "Emails",
    body: [
      "Emails about your money and your account's safety always come. Others (reminders, plans, circles, friends) can be turned off under Me, then Notifications.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep your information while your account is open. Old sessions and used sign-in links are deleted automatically. When you close your account, you can no longer sign in, and we keep only what the law and our payment partners require us to keep, for as long as they require.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can ask for a copy of your information, ask us to correct it, or ask us to delete what we are not required to keep. Email us and we will reply within the time the law sets. You can also complain to the data protection authority where you live.",
    ],
  },
];
