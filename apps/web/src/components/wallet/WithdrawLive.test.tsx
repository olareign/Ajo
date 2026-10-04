import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { polling } from "@/lib/use-payment";
import { MoneyFlow } from "./MoneyFlow";
import { Withdraw } from "./Withdraw";

const replace = vi.fn();
const router = { replace, push: replace };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

const baseMe = {
  displayName: "Ada Ola",
  email: "a@b.co",
  onboarded: true,
  country: "NG",
  kycTier: 1,
  mfaEnabled: true,
};
const rails: Rails = {
  country: "NG",
  currency: "NGN",
  kycApproved: true,
  connected: { fund: true, mandate: true, withdraw: true },
};
const account = { bankCode: "058", bankName: "GTBank", last4: "6789", accountName: "ADA OLA" };
const wallets = {
  wallets: [
    {
      currency: "NGN",
      available: { amount: "4500000", currency: "NGN" },
      locked: { amount: "0", currency: "NGN" },
      savings: { amount: "0", currency: "NGN" },
    },
  ],
};
const payment = (status: string, over: object = {}) => ({
  id: "w1",
  kind: "withdrawal",
  status,
  method: "bank_account",
  amount: { amount: "500000", currency: "NGN" },
  action: null,
  failureReason: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...over,
});

type Reply = { status: number; body: unknown };
type Script = Partial<{
  me: object;
  account: object | null;
  withdraw: Reply[];
  save: Reply[];
  watch: string[];
}>;

function api(script: Script = {}) {
  const sent: { url: string; init?: RequestInit }[] = [];
  const withdraw = [...(script.withdraw ?? [{ status: 200, body: payment("pending") }])];
  const save = [...(script.save ?? [{ status: 200, body: account }])];
  const watch = [...(script.watch ?? ["pending"])];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      const method = init?.method ?? "GET";
      const reply = (r: Reply) => Response.json(r.body, { status: r.status });
      if (url === "/api/me") return Response.json({ ...baseMe, ...script.me });
      if (url === "/api/wallet/rails") return Response.json(rails);
      if (url === "/api/wallet") return Response.json(wallets);
      if (url === "/api/payments/payout-account" && method === "GET")
        return Response.json("account" in script ? (script.account ?? {}) : account);
      if (url === "/api/payments/payout-account")
        return reply(save.length > 1 ? save.shift()! : save[0]!);
      if (url === "/api/payments/banks")
        return Response.json({
          banks: [
            { code: "058", name: "GTBank" },
            { code: "044", name: "Access Bank" },
          ],
        });
      if (url === "/api/payments/withdraw")
        return reply(withdraw.length > 1 ? withdraw.shift()! : withdraw[0]!);
      if (url === "/api/payments/w1")
        return Response.json(payment(watch.length > 1 ? watch.shift()! : watch[0]!));
      return new Response(null, { status: 404 });
    }),
  );
  return {
    sent,
    posts: (url: string) =>
      sent.filter((c) => c.url === url && c.init?.method && c.init.method !== "GET"),
  };
}

const open = () =>
  render(
    <MoneyFlow>
      <Withdraw />
    </MoneyFlow>,
  );
type User = ReturnType<typeof userEvent.setup>;

async function typeAmount(user: User, whole: string) {
  const pad = await screen.findByRole("group", { name: /number pad/i });
  for (const digit of whole) await user.click(within(pad).getByRole("button", { name: digit }));
}
async function typeCode(user: User, digits = "123456") {
  const pad = await screen.findByRole("group", { name: "Number pad" });
  for (const digit of digits) await user.click(within(pad).getByRole("button", { name: digit }));
}
async function typePin(user: User, digits = "493817") {
  const pad = await screen.findByRole("group", { name: "Transaction PIN" });
  for (const digit of digits) await user.click(within(pad).getByRole("button", { name: digit }));
}
const next = (user: User, name = "Continue") => user.click(screen.getByRole("button", { name }));

async function toCode(user: User, whole = "5000") {
  await typeAmount(user, whole);
  await next(user);
  await next(user);
  await typePin(user);
  await next(user);
}

beforeEach(() => {
  polling.everyMs = 5;
});
afterEach(() => {
  polling.everyMs = 3_000;
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("taking money out, for real", () => {
  it("asks for the authenticator app first, and asks the API for nothing until it is on", async () => {
    const mock = api({ me: { mfaEnabled: false } });
    open();
    expect(await screen.findByText("Turn on the authenticator app first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set it up" })).toHaveAttribute("href", "/me/security");
    expect(mock.sent.some((c) => c.url === "/api/wallet")).toBe(false);
  });

  it("shows the real balance and the bank's own name for the account, then sends with the PIN and the code, and follows it to the bank", async () => {
    const mock = api({ watch: ["pending", "pending", "succeeded"] });
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("₦45,000", { selector: "[data-size=s]" })).toBeInTheDocument();
    await typeAmount(user, "5000");
    await next(user);
    const receipt = screen.getByRole("region", { name: "You're withdrawing" });
    expect(within(receipt).getByText("GTBank •••• 6789")).toBeInTheDocument();
    expect(within(receipt).getByText("ADA OLA")).toBeInTheDocument();
    await next(user);
    await typePin(user);
    await next(user);
    await typeCode(user);
    await next(user, "Send it");

    expect(await screen.findByRole("heading", { name: "On its way" })).toBeInTheDocument();
    const [call] = mock.posts("/api/payments/withdraw");
    expect(JSON.parse(call!.init!.body as string)).toEqual({ amount: "500000", pin: "493817" });
    const headers = call!.init!.headers as Record<string, string>;
    expect(headers["X-Ajo-Mfa-Code"]).toBe("123456");
    expect(headers["Idempotency-Key"]).toMatch(/^ajo_/);
    expect(await screen.findByRole("heading", { name: "Money arrived" })).toBeInTheDocument();
    expect(screen.getByText("Sent to GTBank")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my wallet" })).toHaveAttribute(
      "href",
      "/wallet",
    );
  });

  it("says the money was sent back, in words, when the bank refused it", async () => {
    api({ watch: ["pending", "reversed"] });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    expect(await screen.findByRole("heading", { name: "Sent back" })).toBeInTheDocument();
    expect(screen.getByText(/back in your wallet/)).toBeInTheDocument();
  });

  it("will not let someone withdraw more than their real balance", async () => {
    api();
    const user = userEvent.setup();
    open();
    await typeAmount(user, "46000");
    expect(screen.getByRole("alert")).toHaveTextContent(/more than you have/);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("fills in the whole balance when asked", async () => {
    api();
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Withdraw everything" }));
    expect(screen.getByText("₦45,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
  });

  it("goes back to the PIN with the API's words when the PIN is wrong, and clears it", async () => {
    api({ withdraw: [{ status: 422, body: { message: "That PIN isn't right." } }] });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    expect(await screen.findByRole("alert")).toHaveTextContent("That PIN isn't right.");
    expect(screen.getByRole("heading", { name: "Approve it" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("stays on the code when it is wrong, and says each code works once", async () => {
    api({
      withdraw: [
        { status: 401, body: { message: "That code is incorrect.", code: "mfa_code_wrong" } },
      ],
    });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect.*works once/);
    expect(screen.getByRole("heading", { name: "One more check" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("repeats the same key when the same withdrawal is tried again after the connection dropped", async () => {
    const mock = api({
      withdraw: [
        {
          status: 502,
          body: { message: "We couldn't reach Àjọ. Check your connection and try again." },
        },
        { status: 200, body: payment("pending") },
      ],
    });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Look at your wallet.s activity/);
    await typeCode(user, "654321");
    await next(user, "Send it");
    await screen.findByRole("heading", { name: "On its way" });
    const keys = mock
      .posts("/api/payments/withdraw")
      .map((c) => (c.init!.headers as Record<string, string>)["Idempotency-Key"]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("sends a signed-out person to sign in", async () => {
    api({ withdraw: [{ status: 401, body: { message: "Please sign in." } }] });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("goes back to the amount when the API says there is not enough", async () => {
    api({
      withdraw: [
        {
          status: 409,
          body: { message: "You don't have enough in your wallet.", code: "insufficient_funds" },
        },
      ],
    });
    const user = userEvent.setup();
    open();
    await toCode(user);
    await typeCode(user);
    await next(user, "Send it");
    expect(await screen.findByRole("alert")).toHaveTextContent(/enough/);
    expect(screen.getByRole("heading", { name: "Withdraw" })).toBeInTheDocument();
  });
});

describe("choosing where it goes", () => {
  async function toBankCode(user: User, number = "0123456789") {
    await screen.findByRole("option", { name: "GTBank" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Bank" }), "058");
    await user.type(screen.getByRole("textbox", { name: "Account number" }), number);
    await next(user);
  }

  it("starts there when there is no account yet, saves it with a fresh code, then goes to the amount", async () => {
    const mock = api({ account: null });
    const user = userEvent.setup();
    open();
    expect(await screen.findByRole("heading", { name: "Where should it go?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await toBankCode(user);
    await typeCode(user, "654321");
    await next(user, "Save this account");

    expect(await screen.findByRole("heading", { name: "Withdraw" })).toBeInTheDocument();
    const [call] = mock.posts("/api/payments/payout-account");
    expect(JSON.parse(call!.init!.body as string)).toEqual({
      bankCode: "058",
      accountNumber: "0123456789",
    });
    expect((call!.init!.headers as Record<string, string>)["X-Ajo-Mfa-Code"]).toBe("654321");
  });

  it("only takes digits, and wants all ten", async () => {
    api({ account: null });
    const user = userEvent.setup();
    open();
    await screen.findByRole("option", { name: "GTBank" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Bank" }), "058");
    await user.type(screen.getByRole("textbox", { name: "Account number" }), "01a2-3 456");
    expect(screen.getByRole("textbox", { name: "Account number" })).toHaveValue("0123456");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("brings the person back to the form with the bank's reason when the account is not theirs", async () => {
    api({
      account: null,
      save: [
        {
          status: 422,
          body: { message: "That account isn't in your name.", code: "name_mismatch" },
        },
      ],
    });
    const user = userEvent.setup();
    open();
    await toBankCode(user);
    await typeCode(user);
    await next(user, "Save this account");
    expect(await screen.findByRole("alert")).toHaveTextContent("That account isn't in your name.");
    expect(screen.getByRole("heading", { name: "Where should it go?" })).toBeInTheDocument();
  });

  it("lets someone with an account change it", async () => {
    api();
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Change the bank account" }));
    expect(await screen.findByRole("heading", { name: "Where should it go?" })).toBeInTheDocument();
  });
});
