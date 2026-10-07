"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";

/** The top of each section: the tab bar shows here and nowhere deeper (flows keep the whole screen). */
const HOMES = ["/today", "/save", "/circles", "/friends", "/wallet", "/me", "/notifications"];

/** The bottom bar, on the top screen of each section. */
export function AppNav() {
  const path = usePathname() ?? "";
  if (!HOMES.includes(path)) return null;
  return <TabBar current={path} />;
}
