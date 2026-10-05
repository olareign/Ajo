"use client";

import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { InstallCard } from "@/components/install/InstallCard";
import type { Me } from "@/components/onboarding/MeGate";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Initials } from "@/components/ui/Initials";
import { send } from "@/lib/api-send";
import { sendRequest } from "@/lib/friends-client";
import { rememberReturn } from "@/lib/return-to";

type Inviter = Readonly<{ name: string; username: string | null }>;
type Session = "checking" | "signed-out" | Me;
type Done = Readonly<{ relation: "friend" | "requested" }>;

/**
 * Where an invite link lands. Signed in, the person goes straight to adding the inviter: no sign-up
 * questions. Signed out, they sign up or sign in and are brought back here after (the invite is
 * remembered on this device through email confirmation and setup). Installing the app is offered
 * after joining, never before.
 */
export function JoinScreen({ code }: Readonly<{ code: string }>) {
  const [inviter, setInviter] = useState<Inviter | null | undefined>();
  const [session, setSession] = useState<Session>("checking");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done>();
  const [error, setError] = useState<{ message: string; code?: string }>();
  const here = `/join/${code}`;

  useEffect(() => {
    let live = true;
    (async () => {
      const [who, me] = await Promise.all([
        send<Inviter>("GET", `/api/invites/${encodeURIComponent(code)}`),
        fetch("/api/me", { credentials: "same-origin" })
          .then(async (res) => (res.ok ? ((await res.json()) as Me) : null))
          .catch(() => null),
      ]);
      if (!live) return;
      setInviter(who.ok ? who.data : null);
      setSession(me ?? "signed-out");
    })();
    return () => {
      live = false;
    };
  }, [code]);

  async function add(username: string) {
    setError(undefined);
    setBusy(true);
    const result = await sendRequest(username);
    setBusy(false);
    if (result.ok)
      return setDone({ relation: result.data.relation === "friend" ? "friend" : "requested" });
    if (result.failure.kind === "signed-out") return setSession("signed-out");
    setError({
      message: result.failure.message,
      code: result.failure.kind === "refused" ? result.failure.code : undefined,
    });
  }

  const loading = inviter === undefined || session === "checking";
  const valid = Boolean(inviter);
  const me = typeof session === "object" ? session : null;
  const own = Boolean(me && inviter?.username && me.username === inviter.username);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-10 pb-10">
      <div className="grid justify-items-center gap-6 text-center">
        <Logo />
        {loading && (
          <p role="status" className="text-ink-muted">
            One moment…
          </p>
        )}
        {!loading && (
          <>
            {valid && inviter ? (
              me ? (
                <Initials name={inviter.name} size={88} />
              ) : (
                <Avatar size={88} />
              )
            ) : null}
            <h1 className="font-display text-[30px] leading-9 font-bold tracking-[-0.015em] text-primary">
              {own
                ? "This is your own invite"
                : valid && inviter
                  ? `${inviter.name} invited you to Àjọ`
                  : me
                    ? "That invite isn't valid"
                    : "Welcome to Àjọ"}
            </h1>
            <p className="text-[17px] leading-[26px] text-ink-muted">
              {own
                ? "Share it with people you trust; whoever joins through it is suggested to you."
                : me && valid && inviter?.username
                  ? `Add @${inviter.username} as a friend, and start saving together.`
                  : me
                    ? "Ask for a new link, or find them by username."
                    : `Save on your own, or in èsúsú circles with people you trust.${
                        valid && inviter?.username
                          ? ` Once you've joined, you'll see @${inviter.username} as someone you may know.`
                          : ""
                      }`}
            </p>
          </>
        )}
      </div>

      {!loading && (
        <div className="mt-auto grid gap-3 pt-10">
          {/* Signed in and set up: straight to adding the inviter, no account questions. */}
          {me?.onboarded && !done && valid && inviter?.username && !own && (
            <>
              {error && (
                <p role="alert" className="text-center text-[15px] font-medium text-danger">
                  {error.message}{" "}
                  {error.code === "kyc_required" && (
                    <Link href="/verify" className="underline underline-offset-4">
                      Go to my passport
                    </Link>
                  )}
                </p>
              )}
              <Button size="lg" block loading={busy} onClick={() => void add(inviter.username!)}>
                <UserPlus aria-hidden className="size-5" />
                {busy ? "Adding…" : `Add ${inviter.name} as a friend`}
              </Button>
            </>
          )}
          {done && inviter && (
            <>
              <p
                role="status"
                className="flex items-center justify-center gap-2 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] font-semibold text-leaf"
              >
                <Check aria-hidden className="size-5" />
                {done.relation === "friend"
                  ? `You and ${inviter.name} are friends`
                  : `Request sent. ${inviter.name} will see it.`}
              </p>
              <InstallCard />
            </>
          )}
          {me?.onboarded && own && (
            <ButtonLink href="/friends/invite" size="lg" block>
              Share my invite
            </ButtonLink>
          )}
          {me?.onboarded && (
            <ButtonLink href="/today" size="lg" variant="quiet" block>
              Go to Home
            </ButtonLink>
          )}

          {/* Signed in, setup not finished: finish it, then come back here. */}
          {me && !me.onboarded && (
            <ButtonLink href="/onboarding" size="lg" block onClick={() => rememberReturn(here)}>
              Finish setting up
            </ButtonLink>
          )}

          {/* Signed out: sign up or in, and come back here after. */}
          {session === "signed-out" && (
            <>
              <ButtonLink
                href={valid ? `/sign-up?invite=${encodeURIComponent(code)}` : "/sign-up"}
                size="lg"
                block
                onClick={() => valid && rememberReturn(here)}
              >
                Create my account
              </ButtonLink>
              <ButtonLink
                href="/sign-in"
                size="lg"
                variant="quiet"
                block
                onClick={() => valid && rememberReturn(here)}
              >
                I already have an account
              </ButtonLink>
            </>
          )}
        </div>
      )}
    </main>
  );
}
