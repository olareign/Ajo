"use client";

import { Check, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/components/auth/post-json";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { signedOut } from "@/components/security/MfaSetup";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { send } from "@/lib/api-send";
import { removePhone, setPhone } from "@/lib/profile-client";

export function PhoneScreen() {
  return <MeGate needs="onboarded">{(me) => <PhoneNumber me={me} />}</MeGate>;
}

const EXAMPLE: Record<string, string> = { NG: "0803 123 4567", GB: "07700 900123" };

/**
 * The phone number on the account. Written the local way it is read by the account's country; from
 * abroad it needs the country code. It shows as not verified until text-message checks arrive.
 */
function PhoneNumber({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const [saved, setSaved] = useState(me.phone ?? null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<"save" | "remove">();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const ready = value.replace(/\D/g, "").length >= 7;

  async function run(action: "save" | "remove") {
    setError(undefined);
    setDone(undefined);
    setBusy(action);
    const result = action === "save" ? await setPhone(value.trim()) : await removePhone();
    if (signedOut(result)) return router.replace("/sign-in");
    if (!result.ok) {
      setBusy(undefined);
      return setError(messageOf(result));
    }
    // The API keeps the number in international form: show it the way it was stored.
    const fresh = action === "save" ? await send<Me>("GET", "/api/me") : null;
    setBusy(undefined);
    setSaved(action === "save" ? (fresh?.ok ? (fresh.data.phone ?? null) : value.trim()) : null);
    setValue("");
    setDone(action === "save" ? "Phone number saved." : "Phone number removed.");
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Phone number"
        subtitle="So your circle can reach you, and for account checks later."
        backHref="/me"
      />
      <div className="grid gap-5">
        {saved && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift">
            <div className="grid min-w-0">
              <span className="text-[13px] text-ink-muted">On your account</span>
              <span className="truncate text-[17px] font-semibold tabular-nums">{saved}</span>
            </div>
            <span className="shrink-0 rounded-full bg-oro-tint px-2.5 py-1 text-xs font-semibold text-oro-ink">
              Not verified
            </span>
          </div>
        )}
        {done && (
          <p
            role="status"
            className="flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
          >
            <Check aria-hidden className="size-5 shrink-0" />
            {done}
          </p>
        )}
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void run("save");
          }}
        >
          <TextField
            label={saved ? "New phone number" : "Phone number"}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            value={value}
            onChange={(v) => setValue(v.replace(/[^\d+\s()-]/g, ""))}
            hint={`For example ${EXAMPLE[me.country ?? ""] ?? "+234 803 123 4567"}. From abroad, start with + and the country code.`}
          />
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            block
            loading={busy === "save"}
            disabled={!!busy || !ready}
          >
            {busy === "save" ? "Saving…" : "Save number"}
          </Button>
        </form>
        <p className="flex gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[14px] leading-5 text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          We don&apos;t text you yet. When we start, we&apos;ll ask you to confirm this number with
          a code. Only one account can use a number.
        </p>
        {saved && (
          <Button
            variant="quiet"
            size="lg"
            block
            loading={busy === "remove"}
            disabled={!!busy}
            onClick={() => void run("remove")}
          >
            {busy === "remove" ? "Removing…" : "Remove number"}
          </Button>
        )}
      </div>
    </main>
  );
}
