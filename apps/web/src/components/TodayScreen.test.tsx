import { render, screen } from "@testing-library/react";
import { TodayScreen } from "./TodayScreen";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => vi.unstubAllGlobals());

describe("TodayScreen", () => {
  it("greets the person and has a way to their account, always in reach", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true })
          : Response.json({ wallets: [] }),
      ),
    );
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "Hello, Ada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me" })).toHaveAttribute("href", "/me");
  });

  const signedIn = (mfaEnabled: boolean) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me"
          ? Response.json({ displayName: "Ada", email: "a@b.co", onboarded: true, mfaEnabled })
          : Response.json({ wallets: [] }),
      ),
    );

  it("nudges toward the second lock until it is on, because money cannot move without it", async () => {
    signedIn(false);
    render(<TodayScreen />);
    const nudge = await screen.findByRole("link", { name: /Add a second lock/ });
    expect(nudge).toHaveAttribute("href", "/me/security");
  });

  it("stops nudging once the second lock is on", async () => {
    signedIn(true);
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "Hello, Ada" });
    expect(screen.queryByRole("link", { name: /second lock/i })).not.toBeInTheDocument();
  });
});
