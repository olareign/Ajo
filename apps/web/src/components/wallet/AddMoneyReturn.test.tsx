import { render, screen, waitFor } from "@testing-library/react";
import type { Rails } from "@/lib/kyc-client";
import { POLL_EVERY_MS } from "@/lib/use-payment";
import { AddMoneyReturn } from "./AddMoneyReturn";
import { MoneyFlow } from "./MoneyFlow";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams("id=3f0c8a52-1d4e-4c7a-9b0e-6a2f5d8c1e47");
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => query }));

const me = { displayName: "Ada Ola", email: "a@b.co", onboarded: true, country: "NG", kycTier: 1 };
const rails: Rails = {
  country: "NG",
  currency: "NGN",
  kycApproved: true,
  connected: { fund: true, mandate: true, withdraw: true },
};
const payment = (over: object) => ({
  id: "p1",
  kind: "funding",
  status: "pending",
  method: "card",
  amount: { amount: "500000", currency: "NGN" },
  action: null,
  failureReason: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...over,
});

function api(answer: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/me") return Response.json(me);
    if (url === "/api/wallet/rails") return Response.json(rails);
    if (url.startsWith("/api/payments/")) return answer();
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const open = () =>
  render(
    <MoneyFlow>
      <AddMoneyReturn />
    </MoneyFlow>,
  );

beforeEach(() => {
  query = new URLSearchParams("id=3f0c8a52-1d4e-4c7a-9b0e-6a2f5d8c1e47");
});
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("coming back from the payment partner", () => {
  it("says the money is in the wallet only once the payment is settled", async () => {
    api(() => Response.json(payment({ status: "succeeded" })));
    open();
    expect(await screen.findByRole("heading", { name: "Money added" })).toBeInTheDocument();
    expect(screen.getByText("₦5,000", { selector: "[data-size=xl]" })).toBeInTheDocument();
  });

  it("waits, and says it will update by itself, while the bank has not confirmed", async () => {
    api(() => Response.json(payment({ status: "pending" })));
    open();
    expect(await screen.findByText(/updates by itself/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Money added" })).not.toBeInTheDocument();
    expect(POLL_EVERY_MS).toBeGreaterThan(0);
  });

  it("says plainly when the payment failed, that nothing was charged, and offers another go", async () => {
    api(() =>
      Response.json(payment({ status: "failed", failureReason: "Your card was declined." })),
    );
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /card was declined.*haven.t been charged/,
    );
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/wallet/add");
  });

  it("does not trust the address it arrived by: a missing id is not a success", async () => {
    query = new URLSearchParams("status=success");
    api(() => Response.json(payment({ status: "succeeded" })));
    open();
    expect(await screen.findByText("We couldn't find that payment")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Money added" })).not.toBeInTheDocument();
  });

  it("shows the API's reason when it refuses to show a payment", async () => {
    api(() => Response.json({ message: "No such payment." }, { status: 404 }));
    open();
    expect(await screen.findByText("No such payment.")).toBeInTheDocument();
  });

  it("sends a signed-out person to sign in", async () => {
    api(() => Response.json({ message: "Please sign in." }, { status: 401 }));
    open();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
