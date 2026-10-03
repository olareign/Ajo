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
});
