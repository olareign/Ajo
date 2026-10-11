import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookUser,
  Camera,
  Landmark,
  Link2,
  Orbit,
  Phone,
  PiggyBank,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { AsideCard } from "./FormPage";

/*
 * The notes beside forms on a desk. Every sentence states something the app already does or says
 * elsewhere (the API's rules, the help answers, the privacy notice); nothing here may promise more.
 */

export const AddMoneyAside = () => (
  <AsideCard
    Icon={ArrowDownToLine}
    title="Adding money"
    points={[
      "Money goes into your Àjọ wallet, in your own currency.",
      "Cards are paid on our payment partner's secure page, so Àjọ never sees your card number.",
      "If a payment doesn't go through, you aren't charged.",
    ]}
    link={{ href: "/wallet/limits", label: "See your limits" }}
  />
);

export const WithdrawAside = () => (
  <AsideCard
    Icon={ArrowUpFromLine}
    title="Withdrawing"
    points={[
      "Money goes to the bank account you added.",
      "You'll need your PIN and a fresh code from your authenticator app, so a stolen password alone can't move it.",
      "Withdrawals to UK banks aren't switched on yet.",
    ]}
    link={{ href: "/wallet/limits", label: "See your limits" }}
  />
);

export const AutoDebitAside = () => (
  <AsideCard
    Icon={Landmark}
    title="Auto-debit"
    points={[
      "When a saving or circle payment is due and your wallet is short, your bank tops it up.",
      "Circles need it, so a round isn't held up by a short wallet.",
      "You can cancel it here at any time.",
    ]}
  />
);

export const PlanAside = () => (
  <AsideCard
    Icon={PiggyBank}
    title="How saving plans work"
    points={[
      "A set amount is taken daily, weekly or monthly, for as many payments as you choose.",
      "You can pause a plan, top it up, or end it early.",
      "At the end, everything you saved goes back to your wallet.",
    ]}
  />
);

export const CircleAside = () => (
  <AsideCard
    Icon={Orbit}
    title="How circles work"
    points={[
      "Between 3 and 30 people pay the same amount each round; one person takes the whole pot.",
      "The order of turns is set before anyone pays: a draw, members picking, or the order they joined.",
      "Members still building a record lock a deposit, returned when the circle ends.",
      "A missed payment is retried for two days, then the member's deposit covers it.",
    ]}
    link={{ href: "/me/help", label: "More in Help" }}
  />
);

export const SafetyAside = () => (
  <AsideCard
    Icon={ShieldCheck}
    title="Keeping your account safe"
    points={[
      "Àjọ will never ask for your password, PIN or authenticator codes. Anyone who does isn't us.",
      "A new device signing in gets you an email.",
      "Every sign-in and change is listed in your security activity.",
    ]}
    link={{ href: "/me/activity", label: "Security activity" }}
  />
);

export const PhotoAside = () => (
  <AsideCard
    Icon={Camera}
    title="Your photo"
    points={[
      "It helps your circle and friends know it's really you.",
      "It's shown only to you and the people you're connected with.",
      "Location details are removed from the picture before it's stored.",
    ]}
  />
);

export const PhoneAside = () => (
  <AsideCard
    Icon={Phone}
    title="Your phone number"
    points={[
      "So your circle can reach you, and for account checks later.",
      "It shows as not verified until we start checking numbers by text.",
      "Only one account can use a number.",
    ]}
  />
);

export const CloseAside = () => (
  <AsideCard
    Icon={UserX}
    title="Before you close"
    points={[
      "Empty your wallet, end any saving plans, wait for your circles to finish and cancel auto-debit.",
      "Closing signs you out everywhere and can't be undone.",
      "We keep only what the law and our payment partners require us to keep.",
    ]}
    link={{ href: "/me/help", label: "Talk to us first" }}
  />
);

export const IdentityAside = () => (
  <AsideCard
    Icon={BookUser}
    title="Why we check"
    points={[
      "Everyone checks who they are before money moves, so you know who you're saving with.",
      "ID numbers are encrypted before they're stored.",
      "Your limits rise as you verify.",
    ]}
    link={{ href: "/privacy", label: "Privacy notice" }}
  />
);

export const InviteAside = () => (
  <AsideCard
    Icon={Link2}
    title="Inviting friends"
    points={[
      "Share your link or code with people you trust.",
      "You can see who joined through your link.",
    ]}
  />
);
