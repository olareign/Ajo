import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadServerEnv } from "@/server/env";
import { openSeal, sessionCookie, type Session } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const env = loadServerEnv(process.env);
  const cookie = sessionCookie(env.production);
  const session = await openSeal<Session>(
    (await cookies()).get(cookie.name)?.value,
    env.sessionSecret,
  );
  if (!session) redirect("/sign-in");
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
      <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em]">Today</h1>
      <p className="mt-3 text-ink-muted">Nothing needs you yet. Your circles will show up here.</p>
    </main>
  );
}
