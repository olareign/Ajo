"use client";

import {
  BookUser,
  ChevronRight,
  Landmark,
  Orbit,
  PiggyBank,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { InstallCard } from "@/components/install/InstallCard";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TodayFriends, type FriendsGlance } from "@/components/friends/TodayFriends";
import { TodayCircles } from "@/components/circles/TodayCircles";
import { TodaySavings } from "@/components/savings/TodaySavings";
import { WalletSummary } from "@/components/wallet/WalletSummary";
import type { GroupSummary } from "@/lib/groups-client";
import { countryConfig } from "@/lib/kyc-config";
import type { Plan } from "@/lib/savings-client";
import { loadScreen, partData, type ScreenData } from "@/lib/screen-client";
import { MonthPanel } from "./desk/MonthPanel";
import { CirclesPanel, SavingsPanel, Todo, UpNext } from "./desk/TodayDesk";
import { useWide } from "@/lib/use-wide";
import { recall, remember } from "@/lib/visit-cache";
import type { Wallet } from "@/lib/wallet";
import { readFx, type FxEquivalents } from "@/lib/fx";
import { PAGE } from "@/lib/page";

export function TodayScreen() {
  return <MeGate needs="onboarded">{(me) => <Today me={me} />}</MeGate>;
}

/** What Today shows. Each part is null when it could not be had: Today then simply shows less. */
type TodayData = Readonly<{
  wallets: readonly Wallet[] | null;
  plans: readonly Plan[] | null;
  unread: number;
  friends: FriendsGlance | null;
  groups: readonly GroupSummary[] | null;
  /** The balance in other currencies; null when there are no rates. */
  fx: FxEquivalents | null;
}>;

const list = <T,>(body: Record<string, unknown> | null, key: string): readonly T[] | null =>
  body && Array.isArray(body[key]) ? (body[key] as T[]) : null;

export function readToday(parts: ScreenData): TodayData {
  const friends = list<unknown>(partData(parts.friends), "friends");
  const incoming = list<unknown>(partData(parts.requests), "incoming");
  const notices = partData(parts.notices);
  return {
    wallets: list<Wallet>(partData(parts.wallets), "wallets"),
    plans: list<Plan>(partData(parts.plans), "plans"),
    unread: typeof notices?.unread === "number" ? notices.unread : 0,
    friends: friends ? { friends: friends.length, waiting: incoming?.length ?? 0 } : null,
    groups: list<GroupSummary>(partData(parts.groups), "groups"),
    fx: readFx(partData(parts.fx)),
  };
}

const NOTHING: TodayData = {
  wallets: null,
  plans: null,
  unread: 0,
  friends: null,
  groups: null,
  fx: null,
};

function Today({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  // Everything Today shows comes in one request; within a visit the last copy shows at once.
  const [data, setData] = useState<TodayData | undefined>(() => recall<TodayData>("screen:today"));
  const wide = useWide();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadScreen("today");
      if (!live) return;
      if (result.status === "signed-out") return router.replace("/sign-in");
      if (result.status === "failed") return setData((was) => was ?? NOTHING);
      const next = readToday(result.data);
      remember("screen:today", next);
      remember("unread", next.unread);
      setData(next);
    })();
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <main className={PAGE}>
      <ScreenHeader
        tab
        title={`Hello, ${me.displayName}`}
        deskTitle="Overview"
        eyebrow={<TimeOfDay />}
        unread={data ? data.unread : null}
      />
      {wide ? (
        <TodayDesk me={me} data={data} />
      ) : (
        // A phone reads it top to bottom: money, shortcuts, what needs doing, then the rest.
        <div>
          <WalletSummary
            wallets={data?.wallets}
            currency={countryConfig(me.country)?.currency}
            fx={data?.fx}
          />
          <QuickActions />
          {me.kycStatus !== undefined && me.kycStatus !== "approved" && (
            <Link
              href="/verify"
              className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] border border-primary/20 bg-primary-tint p-4 text-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
                <BookUser aria-hidden className="size-6" />
              </span>
              <span className="grid gap-0.5">
                <span className="text-[15px] font-semibold">Get your passport stamped</span>
                <span className="text-[14px] leading-5 text-ink-muted">
                  {me.kycStatus === "rejected"
                    ? "A stamp needs another try."
                    : me.kycStatus === "pending"
                      ? "We're checking your details."
                      : "Five short steps open saving, circles and friends."}
                </span>
              </span>
              <ChevronRight aria-hidden className="ml-auto size-5 shrink-0" />
            </Link>
          )}
          {me.mfaEnabled === false && (
            <Link
              href="/me/security"
              className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] border border-oro/30 bg-oro-tint p-4 text-oro-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-oro text-on-oro">
                <ShieldAlert aria-hidden className="size-6" />
              </span>
              <span className="grid gap-0.5">
                <span className="text-[15px] font-semibold">Add a second lock</span>
                <span className="text-[14px] leading-5">
                  Needed before you can move money. It takes a minute.
                </span>
              </span>
              <ChevronRight aria-hidden className="ml-auto size-5 shrink-0" />
            </Link>
          )}
          <div className="mt-4">
            <UpNext plans={data?.plans} groups={data?.groups} />
          </div>
          <TodaySavings plans={data?.plans} />
          <TodayCircles groups={data?.groups} />
          <TodayFriends state={data?.friends} />
          <InstallCard />
        </div>
      )}
    </main>
  );
}

// Four shortcuts, the ones people use most after their balance. Invite, limits and identity live
// on Me; help is the headset in the top bar; identity also shows as a to-do until it's done.
const TILES = [
  { href: "/save", label: "Save", Icon: PiggyBank, tone: "bg-leaf-tint text-leaf" },
  { href: "/circles", label: "Circles", Icon: Orbit, tone: "bg-tertiary-tint text-tertiary" },
  { href: "/friends", label: "Friends", Icon: Users, tone: "bg-primary-tint text-primary" },
  {
    href: "/wallet/mandate",
    label: "Auto-debit",
    Icon: Landmark,
    tone: "bg-oro-tint text-oro-ink",
  },
] as const;

/** Where people go most after their balance, one tap each, in one row. */
function QuickActions() {
  return (
    <nav
      aria-label="Quick actions"
      className="mt-4 rounded-[var(--radius-l)] bg-surface-raised p-3 shadow-lift"
    >
      <ul className="grid grid-cols-4 gap-x-1 gap-y-2">
        {TILES.map(({ href, label, Icon, tone }) => (
          <li key={href}>
            <Link
              href={href}
              className="grid justify-items-center gap-2 rounded-m px-1 py-2 text-center text-[12px] leading-4 font-semibold hover:bg-surface-sunken"
            >
              <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden className="size-6" />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Good morning" and so on, from the device's clock; drawn after load so the server never guesses it. */
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};
const noSubscription = () => () => undefined;

function TimeOfDay() {
  const word = useSyncExternalStore(noSubscription, greeting, () => "");
  return <p className="h-5 text-[13px] leading-5 text-ink-muted">{word}</p>;
}

/**
 * Today on a desk: the three things that matter, then the detail. Balance; what's due next;
 * this month. Then each pot and each circle, with friends. Only to-dos that need the person show,
 * as slim lines above. No tiles or install prompt: the sidebar and the browser already do that.
 */
function TodayDesk({ me, data }: Readonly<{ me: Me; data: TodayData | undefined }>) {
  const currency = countryConfig(me.country)?.currency;
  const needsId = me.kycStatus !== undefined && me.kycStatus !== "approved";
  return (
    <div className="grid gap-6">
      {(needsId || me.mfaEnabled === false) && (
        <div className="grid gap-3 xl:grid-cols-2">
          {needsId && (
            <Todo
              href="/verify"
              Icon={BookUser}
              tone="bg-primary-tint text-ink"
              title="Get your passport stamped"
            >
              {me.kycStatus === "rejected"
                ? "A stamp needs another try."
                : me.kycStatus === "pending"
                  ? "We're checking your details."
                  : "Five short steps open saving, circles and friends."}
            </Todo>
          )}
          {me.mfaEnabled === false && (
            <Todo
              href="/me/security"
              Icon={ShieldAlert}
              tone="bg-oro-tint text-oro-ink"
              title="Add a second lock"
            >
              Needed before you can move money. It takes a minute.
            </Todo>
          )}
        </div>
      )}
      {/* Three columns that each stack on their own, so a short card leaves no gap: your money
          and your pots; what's next and your circles; this month and friends. On a narrower desk
          the third sits under the first two, its two cards side by side. */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-6 [&>*]:mt-0">
          <WalletSummary wallets={data?.wallets} currency={currency} fx={data?.fx} />
          <SavingsPanel plans={data?.plans} />
        </div>
        <div className="grid gap-6">
          <UpNext plans={data?.plans} groups={data?.groups} />
          <CirclesPanel groups={data?.groups} />
        </div>
        <div className="grid items-start gap-6 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1 [&_a]:mt-0">
          <MonthPanel currency={currency} recent balance={false} />
          <TodayFriends state={data?.friends} />
        </div>
      </div>
    </div>
  );
}
