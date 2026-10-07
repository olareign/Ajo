export type Role = "owner" | "support" | "compliance" | "finance";
export type Permission =
  | "overview:read"
  | "users:read"
  | "users:suspend"
  | "users:reinstate"
  | "kyc:read"
  | "kyc:decide"
  | "cases:read"
  | "cases:write"
  | "audit:read"
  | "team:manage";

export type Me = Readonly<{
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: readonly Permission[];
}>;

export type Overview = Readonly<{
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingKyc: number;
  openCases: number;
  admins: number;
}>;

export type PersonSummary = Readonly<{
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  country: string | null;
  status: string;
  createdAt: string;
}>;

export type PersonDetail = Readonly<{
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  username: string | null;
  country: string | null;
  goal: string | null;
  phone: string | null;
  phoneVerified: boolean;
  status: string;
  statusNote: string | null;
  createdAt: string;
  closedAt: string | null;
  kyc: Readonly<{ status: string; tier: number; via: string; override: string | null }>;
  balances: readonly { currency: string; kind: string; amount: string }[];
  activePlans: number;
  activeCircles: number;
  openCases: number;
  activeSessions: number;
  recentSecurity: readonly { kind: string; at: string }[];
}>;

export type KycQueueRow = Readonly<{
  id: string;
  email: string;
  displayName: string;
  country: string | null;
  waitingSteps: number;
  oldestAt: string;
  held: boolean;
}>;

export type KycDetail = Readonly<{
  id: string;
  email: string;
  displayName: string;
  country: string | null;
  status: string;
  tier: number;
  via: string;
  override: string | null;
  steps: readonly {
    step: string;
    status: string;
    reason: string | null;
    reference: string | null;
    updatedAt: string | null;
  }[];
  overrideHistory: readonly { from: string | null; to: string | null; at: string }[];
  documents: readonly unknown[];
}>;

export type CaseSummary = Readonly<{
  id: string;
  status: "open" | "resolved" | "written_off";
  round: number;
  currency: string;
  amountOwed: string;
  coveredByDeposit: string;
  stillOwed: string;
  openedAt: string;
  resolvedAt: string | null;
  group: Readonly<{ id: string; name: string }>;
  member: Readonly<{ id: string; name: string; email: string }>;
}>;

export type CaseDetail = CaseSummary &
  Readonly<{
    memberDetails: Readonly<{
      username: string | null;
      country: string | null;
      phone: string | null;
      accountStatus: string;
      kycStatus: string;
      kycTier: number;
      kycVia: string;
    }>;
    notes: readonly { id: string; note: string; at: string; by: string }[];
  }>;

export type AuditItem = Readonly<{
  id: string;
  at: string;
  admin_email: string;
  role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  outcome: "ok" | "denied" | "failed";
}>;

export type TeamMember = Readonly<{
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "invited" | "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
}>;

export type SetupCodeResult = Readonly<{ setupCode: string; expiresAt: string }>;
