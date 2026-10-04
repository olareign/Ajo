import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { AddMoney } from "./AddMoney";
import { Limits } from "./Limits";
import { Mandate } from "./Mandate";
import { MoneyFlow } from "./MoneyFlow";
import { Withdraw } from "./Withdraw";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams("preview=1");
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
}));
const leaveFor = vi.fn<(url: string) => boolean>(() => true);
vi.mock("@/lib/navigate", () => ({ leaveFor: (url: string) => leaveFor(url) }));
vi.mock("@/lib/preview", async (original) => ({
  ...(await original<typeof import("@/lib/preview")>()),
  pause: async () => undefined,
}));

const me = {
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  country: "NG",
  kycTier: 1,
};
const rails = (over: Partial<Rails> = {}): Rails => ({
  country: "NG",
  currency: "NGN",
  kycApproved: false,
  connected: { fund: false, mandate: false, withdraw: false },
  ...over,
});

function api(profile: object = me, state: Rails = rails()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return Response.json(profile);
      if (url === "/api/wallet/rails") return Response.json(state);
      return new Response(null, { status: 404 });
    }),
  );
}
const open = (screen: React.ReactNode) => render(<MoneyFlow>{screen}</MoneyFlow>);
const connected = { fund: true, mandate: true, withdraw: true };

beforeEach(() => {
  query = new URLSearchParams("preview=1");
  api();
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("money screens that cannot open yet", () => {
  beforeEach(() => {
    query = new URLSearchParams();
  });

  it.each([
    ["adding money", <AddMoney key="a" />, "/wallet/add?preview=1"],
    ["withdrawing", <Withdraw key="w" />, "/wallet/withdraw?preview=1"],
    ["auto-debit", <Mandate key="m" />, "/wallet/mandate?preview=1"],
  ])("say %s isn't switched on, and offer the preview", async (_name, screenEl, preview) => {
    open(screenEl);
    expect(await screen.findByText("Not switched on yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview the flow" })).toHaveAttribute("href", preview);
    expect(screen.queryByRole("button", { name: /Continue|Set up/ })).not.toBeInTheDocument();
  });

  it("asks someone who is not verified to finish their passport, even when payments are connected", async () => {
    api(me, rails({ connected, kycApproved: false }));
    open(<AddMoney />);
    expect(await screen.findByText("Finish your passport first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to my passport" })).toHaveAttribute(
      "href",
      "/verify",
    );
  });
});

describe("adding money", () => {
  it("walks from method to amount to a receipt, and lands the coin", async () => {
    const user = userEvent.setup();
    open(<AddMoney />);
    expect(await screen.findByText(/Preview: nothing here is saved or sent/)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Debit card/ }));
    await user.click(next);

    await user.click(screen.getByRole("radio", { name: "₦10,000" }));
    expect(screen.getByText("₦10,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const receipt = screen.getByRole("region", { name: "You're adding" });
    expect(within(receipt).getByText("Debit card")).toBeInTheDocument();
    expect(within(receipt).getByText("Straight away")).toBeInTheDocument();
    expect(within(receipt).getByText("₦10,000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add money" }));

    expect(await screen.findByRole("heading", { name: "Money added" })).toBeInTheDocument();
    expect(screen.getByText(/added \(preview\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my wallet" })).toHaveAttribute(
      "href",
      "/wallet",
    );
  });

  it("types an amount on the pad, ignoring a leading zero, and will not continue with nothing", async () => {
    const user = userEvent.setup();
    open(<AddMoney />);
    await user.click(await screen.findByRole("radio", { name: /USSD/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const pad = screen.getByRole("group", { name: /number pad/ });
    await user.click(within(pad).getByRole("button", { name: "0" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.click(within(pad).getByRole("button", { name: "7" }));
    await user.click(within(pad).getByRole("button", { name: "5" }));
    expect(screen.getByText("₦75", { selector: "[data-size=xl]" })).toBeInTheDocument();
  });

  it("shows an account to send to, in place of an amount, for a bank transfer", async () => {
    const user = userEvent.setup();
    open(<AddMoney />);
    await user.click(await screen.findByRole("radio", { name: /Bank transfer/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Your own Àjọ account \(sample\)/)).toBeInTheDocument();
    expect(screen.getByText("7812345678")).toBeInTheDocument();
    expect(screen.getByText("ADA OLA")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /number pad/ })).not.toBeInTheDocument();
  });

  it("offers only the UK bank transfer, with a sort code, and no cards or Direct Debit", async () => {
    api({ ...me, country: "GB" });
    const user = userEvent.setup();
    open(<AddMoney />);
    await screen.findByRole("radio", { name: /Bank transfer/ });
    expect(screen.queryByRole("radio", { name: /Debit card/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Direct Debit/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Bank transfer/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("04-00-04")).toBeInTheDocument();
  });

  it("goes back a step at a time", async () => {
    const user = userEvent.setup();
    open(<AddMoney />);
    await user.click(await screen.findByRole("radio", { name: /Debit card/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add money" })).toBeInTheDocument();
  });
});

describe("adding money for real", () => {
  type Reply = { status: number; body: unknown };
  let fund: ReturnType<typeof vi.fn<(init?: RequestInit) => void>>;

  function live(replies: Reply[], state: Rails = rails({ connected, kycApproved: true })) {
    query = new URLSearchParams();
    fund = vi.fn<(init?: RequestInit) => void>();
    const queue = [...replies];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/me") return Response.json(me);
        if (url === "/api/wallet/rails") return Response.json(state);
        if (url === "/api/payments/fund") {
          fund(init);
          const next = queue.shift() ?? replies.at(-1)!;
          return Response.json(next.body, { status: next.status });
        }
        return new Response(null, { status: 404 });
      }),
    );
  }
  const pending = (over: object = {}) => ({
    status: 200,
    body: {
      id: "p1",
      status: "pending",
      action: { type: "redirect", url: "https://checkout.paystack.com/abc" },
      ...over,
    },
  });
  async function toReview(user: ReturnType<typeof userEvent.setup>, method = /Debit card/) {
    await user.click(await screen.findByRole("radio", { name: method }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "₦5,000" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
  afterEach(() => leaveFor.mockClear());

  it("sends the amount in kobo, then leaves for the partner's page, charging nothing here", async () => {
    live([pending()]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));

    await waitFor(() => expect(leaveFor).toHaveBeenCalledWith("https://checkout.paystack.com/abc"));
    const init = fund.mock.calls[0]![0] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ amount: "500000", method: "card" });
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/^ajo_/);
    expect(screen.queryByRole("heading", { name: "Money added" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Taking you to pay…" })).toBeDisabled();
  });

  it("repeats the same key when the same payment is tried again after a failure, so it cannot be charged twice", async () => {
    live([{ status: 502, body: { message: "We couldn't reach Àjọ." } }, pending()]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t reach/);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await waitFor(() => expect(fund).toHaveBeenCalledTimes(2));
    const keys = fund.mock.calls.map(
      ([init]) => ((init as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it("makes a new key when the amount changes", async () => {
    live([{ status: 502, body: { message: "Try again." } }, pending()]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("radio", { name: "₦10,000" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await waitFor(() => expect(fund).toHaveBeenCalledTimes(2));
    const keys = fund.mock.calls.map(
      ([init]) => ((init as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
    );
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("goes straight to the amount for a bank transfer, with no pretend account", async () => {
    live([pending()]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await user.click(await screen.findByRole("radio", { name: /Bank transfer/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("group", { name: /number pad/ })).toBeInTheDocument();
    expect(screen.queryByText("7812345678")).not.toBeInTheDocument();
  });

  it("says why when the API refuses, and points to the passport when verification is missing", async () => {
    live([{ status: 403, body: { message: "Finish verification first.", code: "kyc_required" } }]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finish verification first.");
    expect(screen.getByRole("link", { name: "Go to my passport" })).toHaveAttribute(
      "href",
      "/verify",
    );
    expect(leaveFor).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add money" })).toBeEnabled();
  });

  it("sends a signed-out person to sign in", async () => {
    live([{ status: 401, body: { message: "Please sign in." } }]);
    const user = userEvent.setup();
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });

  it("follows the payment on the return screen when there is no page to leave for, or it is not secure", async () => {
    live([pending({ action: null })]);
    const user = userEvent.setup();
    const { unmount } = open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/wallet/add/return?id=p1"));
    unmount();
    replace.mockReset();

    leaveFor.mockReturnValueOnce(false);
    live([pending({ action: { type: "redirect", url: "http://evil.example" } })]);
    open(<AddMoney />);
    await toReview(user);
    await user.click(screen.getByRole("button", { name: "Add money" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/wallet/add/return?id=p1"));
  });
});

describe("withdrawing", () => {
  async function toReview(user: ReturnType<typeof userEvent.setup>, whole: string) {
    for (const digit of whole) {
      await user.click(
        within(await screen.findByRole("group", { name: /number pad/ })).getByRole("button", {
          name: digit,
        }),
      );
    }
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
  async function toPin(user: ReturnType<typeof userEvent.setup>, whole: string) {
    await toReview(user, whole);
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
  async function enterPin(user: ReturnType<typeof userEvent.setup>) {
    const pad = screen.getByRole("group", { name: "Transaction PIN" });
    for (const digit of "493817")
      await user.click(within(pad).getByRole("button", { name: digit }));
    await user.click(screen.getByRole("button", { name: "Send it" }));
  }

  it("will not let someone withdraw more than they have", async () => {
    const user = userEvent.setup();
    open(<Withdraw />);
    const pad = await screen.findByRole("group", { name: /number pad/ });
    for (const digit of "46000") await user.click(within(pad).getByRole("button", { name: digit }));
    expect(screen.getByRole("alert")).toHaveTextContent(/more than you have/);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("fills in everything when asked", async () => {
    const user = userEvent.setup();
    open(<Withdraw />);
    await user.click(await screen.findByRole("button", { name: "Withdraw everything" }));
    expect(screen.getByText("₦45,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
  });

  it("goes amount, receipt, PIN, then follows the money to the bank and arrives", async () => {
    const user = userEvent.setup();
    open(<Withdraw />);
    await toReview(user, "5000");
    const receipt = screen.getByRole("region", { name: "You're withdrawing" });
    expect(within(receipt).getByText("GTBank •••• 6789")).toBeInTheDocument();
    expect(within(receipt).getByText("ADA OLA")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Send it" })).toBeDisabled();
    await enterPin(user);
    expect(
      await screen.findByRole("heading", { name: "Money arrived" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to GTBank")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my wallet" })).toBeInTheDocument();
  });

  it("shows a bank refusal being reversed, in words", async () => {
    const user = userEvent.setup();
    open(<Withdraw />);
    await toPin(user, "13666");
    await enterPin(user);
    expect(
      await screen.findByRole("heading", { name: "Sent back" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/back in your wallet/)).toBeInTheDocument();
  });

  it("refuses to pretend outside a preview, even when connected and approved", async () => {
    query = new URLSearchParams();
    api(me, rails({ connected, kycApproved: true }));
    const user = userEvent.setup();
    open(<Withdraw />);
    await toPin(user, "5000");
    await enterPin(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Nothing was sent/);
    expect(screen.queryByText("On its way")).not.toBeInTheDocument();
  });
});

describe("auto-debit", () => {
  it("is set up, waits for the bank, is active, and can be cancelled and set up again", async () => {
    const user = userEvent.setup();
    open(<Mandate />);
    expect(await screen.findByText("Not set up")).toBeInTheDocument();
    expect(screen.getByText("NIBSS Direct Debit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set up auto-debit" }));
    await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Cancel auto-debit" }));
    expect(
      screen.getByText(/can.t cancel while you.re in an active saving plan/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel it" }));
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set it up again" }));
    await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
  });

  it("lets someone keep it", async () => {
    const user = userEvent.setup();
    open(<Mandate />);
    await user.click(await screen.findByRole("button", { name: "Set up auto-debit" }));
    await user.click(await screen.findByRole("button", { name: "Cancel auto-debit" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("describes the UK's own scheme", async () => {
    api({ ...me, country: "GB" });
    const user = userEvent.setup();
    open(<Mandate />);
    expect(await screen.findByText("Bacs Direct Debit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Set up auto-debit" }));
    expect(await screen.findByText(/Direct Debit Guarantee/)).toBeInTheDocument();
  });
});

describe("limits", () => {
  it("shows the ladder with sample numbers in a preview, and says they are samples", async () => {
    open(<Limits />);
    expect(await screen.findByText("Passport stamped")).toBeInTheDocument();
    expect(screen.getByText("₦100,000")).toBeInTheDocument();
    expect(screen.getByText(/Sample numbers/)).toBeInTheDocument();
    expect(screen.getByText("You are here")).toBeInTheDocument();
  });

  it("shows no numbers before payments are connected, only what each step opens", async () => {
    query = new URLSearchParams();
    api({ ...me, kycTier: 0 });
    open(<Limits />);
    expect(await screen.findByText("Passport stamped")).toBeInTheDocument();
    expect(screen.queryByText(/₦/)).not.toBeInTheDocument();
    expect(screen.getByText(/Exact amounts appear here/)).toBeInTheDocument();
    expect(screen.getByText("Not verified").closest("li")).toHaveAttribute("aria-current", "step");
  });

  it("has two rungs in the UK, and three in Nigeria", async () => {
    api({ ...me, country: "GB" });
    const { unmount } = open(<Limits />);
    await screen.findByText("Passport stamped");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    unmount();
    api();
    open(<Limits />);
    await screen.findByText("BVN added");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
