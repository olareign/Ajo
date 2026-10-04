import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rails } from "@/lib/kyc-client";
import { Mandate } from "./Mandate";
import { MoneyFlow } from "./MoneyFlow";

const replace = vi.fn();
const router = { replace, push: replace };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
const leaveFor = vi.fn<(url: string) => boolean>(() => true);
vi.mock("@/lib/navigate", () => ({ leaveFor: (url: string) => leaveFor(url) }));
vi.mock("@/lib/use-payment", async (original) => ({
  ...(await original<typeof import("@/lib/use-payment")>()),
  POLL_EVERY_MS: 5,
}));

const me = { displayName: "Ada Ola", email: "a@b.co", onboarded: true, country: "NG", kycTier: 1 };
const rails: Rails = {
  country: "NG",
  currency: "NGN",
  kycApproved: true,
  connected: { fund: true, mandate: true, withdraw: true },
};
const view = (status: string, over: object = {}) => ({
  id: "m1",
  status,
  action: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...over,
});

type Handler = (init?: RequestInit) => Response | Promise<Response>;
function api(handlers: Partial<Record<"GET" | "POST" | "DELETE", Handler>>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/me") return Response.json(me);
    if (url === "/api/wallet/rails") return Response.json(rails);
    if (url === "/api/payments/mandate") {
      const handler = handlers[(init?.method ?? "GET") as "GET" | "POST" | "DELETE"];
      return handler ? handler(init) : new Response(null, { status: 405 });
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const open = () =>
  render(
    <MoneyFlow>
      <Mandate />
    </MoneyFlow>,
  );
const calls = (mock: ReturnType<typeof api>, method: string) =>
  mock.mock.calls.filter(
    ([url, init]) => url === "/api/payments/mandate" && (init?.method ?? "GET") === method,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  leaveFor.mockClear();
});

describe("auto-debit for real", () => {
  it("offers to set it up when there is none, and takes the person to their bank to give permission", async () => {
    const mock = api({
      GET: () => Response.json({}),
      POST: () =>
        Response.json(
          view("pending", { action: { type: "redirect", url: "https://bank.example/dd" } }),
        ),
    });
    const user = userEvent.setup();
    open();
    const setUp = await screen.findByRole("button", { name: "Set up auto-debit" });
    expect(screen.getByText("Not set up")).toBeInTheDocument();
    expect(screen.getByText("Your bank account")).toBeInTheDocument();
    await user.click(setUp);
    await waitFor(() => expect(leaveFor).toHaveBeenCalledWith("https://bank.example/dd"));
    expect(calls(mock, "POST")).toHaveLength(1);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("waits for the bank on coming back, and turns active only when the API says so", async () => {
    const answers = ["pending", "pending", "active"];
    api({ GET: () => Response.json(view(answers.length > 1 ? answers.shift()! : answers[0]!)) });
    open();
    expect(await screen.findByText("Waiting for your bank")).toBeInTheDocument();
    expect(screen.getByText(/Waiting for your bank to confirm/)).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.queryByText(/Waiting for your bank to confirm/)).not.toBeInTheDocument();
  });

  it("lets someone reopen their bank's page while it is still waiting", async () => {
    api({
      GET: () =>
        Response.json(
          view("pending", { action: { type: "redirect", url: "https://bank.example/dd" } }),
        ),
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: /Open my bank.s page again/ }));
    expect(leaveFor).toHaveBeenCalledWith("https://bank.example/dd");
  });

  it("cancels an active one through the API, then offers to set it up again", async () => {
    const mock = api({
      GET: () => Response.json(view("active")),
      DELETE: () => Response.json(view("cancelled")),
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Cancel auto-debit" }));
    await user.click(screen.getByRole("button", { name: "Cancel it" }));
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(calls(mock, "DELETE")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Set it up again" })).toBeInTheDocument();
  });

  it("stays active, and says why, when a plan or circle still depends on it", async () => {
    api({
      GET: () => Response.json(view("active")),
      DELETE: () =>
        Response.json(
          {
            message: "You're in a saving plan or circle that depends on auto-debit.",
            code: "active_commitments",
          },
          { status: 409 },
        ),
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Cancel auto-debit" }));
    await user.click(screen.getByRole("button", { name: "Cancel it" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/depends on auto-debit/);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("says when the bank did not go through, and lets the person try again", async () => {
    api({ GET: () => Response.json(view("failed")) });
    open();
    expect(await screen.findByText("Didn't go through")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the API's reason when setting up is refused, and nothing becomes active", async () => {
    api({
      GET: () => Response.json({}),
      POST: () =>
        Response.json(
          { message: "Finish verification first.", code: "kyc_required" },
          { status: 403 },
        ),
    });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Set up auto-debit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finish verification first.");
    expect(leaveFor).not.toHaveBeenCalled();
  });

  it("sends a signed-out person to sign in", async () => {
    api({ GET: () => Response.json({ message: "Please sign in." }, { status: 401 }) });
    open();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
