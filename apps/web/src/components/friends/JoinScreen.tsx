"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { send } from "@/lib/api-send";

type Inviter = Readonly<{ name: string; username: string | null }>;

/**
 * Where an invite link lands, before the person has an account: who it is from (a first name and
 * handle), and the way to join. A code that means nothing still gets a warm welcome, just without a name.
 */
export function JoinScreen({ code }: Readonly<{ code: string }>) {
  const [inviter, setInviter] = useState<Inviter | null | undefined>();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await send<Inviter>("GET", `/api/invites/${encodeURIComponent(code)}`);
      if (live) setInviter(result.ok ? result.data : null);
    })();
    return () => {
      live = false;
    };
  }, [code]);

  const valid = inviter !== null && inviter !== undefined;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-10 pb-10">
      <div className="grid justify-items-center gap-6 text-center">
        <Logo />
        {inviter === undefined && (
          <p role="status" className="text-ink-muted">
            One moment…
          </p>
        )}
        {inviter !== undefined && (
          <>
            {valid && <Avatar size={88} />}
            <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em] text-primary">
              {valid ? `${inviter.name} invited you to Àjọ` : "Welcome to Àjọ"}
            </h1>
            <p className="text-[17px] leading-[26px] text-ink-muted">
              Save on your own, or in èsúsú circles with people you trust.
              {valid && inviter.username
                ? ` Once you've joined, you'll see @${inviter.username} as someone you may know.`
                : ""}
            </p>
          </>
        )}
      </div>
      <div className="mt-auto grid gap-3 pt-10">
        <ButtonLink
          href={valid ? `/sign-up?invite=${encodeURIComponent(code)}` : "/sign-up"}
          size="lg"
          block
        >
          Create my account
        </ButtonLink>
        <ButtonLink href="/sign-in" size="lg" variant="quiet" block>
          I already have an account
        </ButtonLink>
      </div>
    </main>
  );
}
