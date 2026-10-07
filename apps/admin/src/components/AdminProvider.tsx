"use client";

import { createContext, useContext } from "react";
import type { Me, Permission } from "@/lib/types";

const Context = createContext<Me | null>(null);
export const AdminContext = Context;

export function useAdmin(): Me {
  const me = useContext(Context);
  if (!me) throw new Error("useAdmin must be used inside the console");
  return me;
}

/** Whether the signed-in member's role holds a permission (the server checks again on every call). */
export function useCan(): (permission: Permission) => boolean {
  const me = useAdmin();
  return (permission) => me.permissions.includes(permission);
}
