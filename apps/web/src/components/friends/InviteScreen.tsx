"use client";

import { Check, Copy, MessageCircle, MessageSquareText, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Invite } from "@/lib/friends-client";
import { inviteText, smsUrl, whatsAppUrl } from "@/lib/share";
import { useFriends, useFriendsLock } from "./FriendsFlow";

/** Your own invite link, ready to send. Whoever joins through it is suggested to you as a friend. */
export function InviteScreen() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [invite, setInvite] = useState<Invite | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  // Only drawn once the link has loaded in the browser, so there is nothing for the server to disagree with.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.invite();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setInvite("failed");
      }
      setInvite(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Invite" path="/friends/invite" />;

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Blocked clipboards: the link is on screen to copy by hand.
    }
  }
  async function share(link: string) {
    try {
      await navigator.share({ title: "Àjọ", text: inviteText(link), url: link });
    } catch {
      // Closing the share sheet is not a failure.
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Invite someone"
        subtitle="Send your link. When they join, you'll see each other as people you may know."
        backHref={href("/friends")}
      />
      {invite === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {invite === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your link. Check your connection and try again.
          </p>
          <Button onClick={() => (setInvite(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}
      {invite && invite !== "failed" && (
        <div className="grid gap-5">
          <section
            aria-label="Your invite link"
            className="relative grid gap-3 rounded-[var(--radius-l)] bg-primary-tint p-5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-primary/35"
            />
            <p className="text-[13px] font-semibold text-tertiary">
              Your invite{preview ? " (sample)" : ""}
            </p>
            <p className="font-mono text-[28px] leading-8 font-semibold tracking-[0.12em]">
              {invite.code}
            </p>
            <p className="text-[14px] break-all text-ink-muted">{invite.link}</p>
          </section>
          <ButtonLink
            href={whatsAppUrl(invite.link)}
            size="lg"
            variant="money"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle aria-hidden className="size-5" />
            Send on WhatsApp
          </ButtonLink>
          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href={smsUrl(invite.link)} variant="quiet">
              <MessageSquareText aria-hidden className="size-5" />
              Text message
            </ButtonLink>
            <Button variant="quiet" onClick={() => void copy(invite.link)}>
              {copied ? (
                <Check aria-hidden className="size-5" />
              ) : (
                <Copy aria-hidden className="size-5" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          {canShare && (
            <Button variant="quiet" onClick={() => void share(invite.link)}>
              <Share2 aria-hidden className="size-5" />
              More ways to share
            </Button>
          )}
          <p className="text-[13px] leading-5 text-ink-muted">
            Your link only shows your first name and username. Joining through it doesn&apos;t make
            anyone your friend until you both agree.
          </p>
        </div>
      )}
    </main>
  );
}
