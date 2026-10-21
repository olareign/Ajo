import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { BankAccounts } from "./BankAccounts";
import { MoneyFlow } from "./MoneyFlow";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
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

type Reply = { status: number; body: unknown };
function api(opts: { me?: object; account?: object | null; save?: Reply; railsBody?: Rails } = {}) {
  const sent: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      sent.push({ url, init });
      const method = init?.method ?? "GET";
      if (url === "/api/me") return Response.json({ ...baseMe, ...opts.me });
      if (url === "/api/wallet/rails") return Response.json(opts.railsBody ?? rails);
      if (url === "/api/payments/payout-account" && method === "GET")
        return Response.json("account" in opts ? (opts.account ?? {}) : account);
      if (url === "/api/payments/payout-account") {
        const r = opts.save ?? {
          status: 200,
          body: { ...account, bankName: "Access Bank", last4: "0001" },
        };
        return Response.json(r.body, { status: r.status });
      }
      if (url === "/api/payments/banks")
        return Response.json({
          banks: [
            { code: "058", name: "GTBank" },
            { code: "044", name: "Access Bank" },
          ],
        });
      return new Response(null, { status: 404 });
    }),
  );
  return { puts: () => sent.filter((c) => c.init?.method === "PUT") };
}
const open = () =>
  render(
    <MoneyFlow>
      <BankAccounts />
    </MoneyFlow>,
  );

beforeEach(() => {
  query = new URLSearchParams();
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("bank accounts", () => {
  it("shows the account withdrawals go to", async () => {
    api();
    open();
    const card = await screen.findByRole("region", { name: "Your bank account" });
    expect(card).toHaveTextContent("GTBank");
    expect(card).toHaveTextContent("ADA OLA · ending 6789");
    expect(screen.getByRole("button", { name: "Change account" })).toBeInTheDocument();
  });

  it("asks for the authenticator first, and asks the API for nothing until it is on", async () => {
    api({ me: { mfaEnabled: false } });
    open();
    expect(await screen.findByText("Add a second lock first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up the authenticator" })).toHaveAttribute(
      "href",
      "/me/security",
    );
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      "/api/payments/payout-account",
      expect.anything(),
    );
  });

  it("offers to add one when there is none, and saves it with a fresh code", async () => {
    const user = userEvent.setup();
    const server = api({ account: null });
    open();
    expect(await screen.findByText("No bank account yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add your bank account" }));
    const save = screen.getByRole("button", { name: "Save this account" });
    expect(save).toBeDisabled();
    await screen.findByRole("option", { name: "Access Bank" });
    await user.selectOptions(screen.getByLabelText("Bank"), "044");
    await user.type(screen.getByLabelText("Account number"), "0123456789");
    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(save);
    await waitFor(() => expect(server.puts()).toHaveLength(1));
    expect(JSON.parse(String(server.puts()[0]!.init!.body))).toEqual({
      bankCode: "044",
      accountNumber: "0123456789",
    });
    expect(await screen.findByText(/ending 0001/)).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Bank account details" })).not.toBeInTheDocument();
  });

  it("says why when the account is refused, and keeps the form open", async () => {
    const user = userEvent.setup();
    api({
      save: { status: 422, body: { code: "mfa_code_wrong", message: "That code is not right." } },
    });
    open();
    await user.click(await screen.findByRole("button", { name: "Change account" }));
    await screen.findByRole("option", { name: "Access Bank" });
    await user.selectOptions(screen.getByLabelText("Bank"), "044");
    await user.type(screen.getByLabelText("Account number"), "0123456789");
    await user.type(screen.getByLabelText("Authenticator code"), "000000");
    await user.click(screen.getByRole("button", { name: "Save this account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code is not right. Each code works once",
    );
    expect(screen.getByLabelText("Authenticator code")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form", { name: "Bank account details" })).not.toBeInTheDocument();
  });

  it("shows a sample in a preview and never asks for the real account", async () => {
    query = new URLSearchParams("preview=1");
    api();
    open();
    expect(await screen.findByText("Sample Bank")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change account" })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalledWith("/api/payments/payout-account");
  });

  it("is closed until payments are connected", async () => {
    api({
      railsBody: { ...rails, connected: { fund: false, mandate: false, withdraw: false } },
    });
    open();
    expect(await screen.findByText("Not switched on yet")).toBeInTheDocument();
  });
});
