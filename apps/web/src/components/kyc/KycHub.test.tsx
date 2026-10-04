import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { KycState } from "@/lib/kyc";
import { previewState } from "@/lib/kyc";
import { KycFlow } from "./KycFlow";
import { KycHub } from "./KycHub";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
  query = new URLSearchParams();
  sessionStorage.clear();
});

const me = {
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  country: "NG",
};

function api(kyc: Partial<KycState> | "fail", profile: object = me) {
  const base = previewState("fresh", (profile as { country: "NG" | "GB" }).country);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return Response.json(profile);
      if (url === "/api/kyc") {
        return kyc === "fail"
          ? new Response(null, { status: 500 })
          : Response.json({ ...base, connected: false, ...kyc });
      }
      return new Response(null, { status: 404 });
    }),
  );
}
const screenOf = () =>
  render(
    <KycFlow>
      <KycHub />
    </KycFlow>,
  );

describe("the passport when verification is not switched on", () => {
  it("shows the passport with empty stamps, says why it is locked, and offers the preview", async () => {
    api({});
    screenOf();
    expect(await screen.findByRole("heading", { name: "Your Àjọ passport" })).toBeInTheDocument();
    const passport = screen.getByRole("region", { name: "Your Àjọ passport" });
    expect(within(passport).getAllByRole("img", { name: /not stamped yet/ })).toHaveLength(6);
    expect(screen.getByText("Ada Ola")).toBeInTheDocument();
    expect(screen.getByText("@ada_ola")).toBeInTheDocument();
    expect(screen.getByText(/isn.t switched on yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview the flow" })).toHaveAttribute(
      "href",
      "/verify?preview=1",
    );
    // Locked: no stamp leads anywhere.
    expect(within(passport).queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Start|Continue/ })).not.toBeInTheDocument();
  });

  it("shows the BVN slot in Nigeria and not in the UK", async () => {
    api({});
    const { unmount } = screenOf();
    expect(await screen.findByText("Optional")).toBeInTheDocument();
    unmount();
    api({}, { ...me, country: "GB" });
    screenOf();
    await screen.findByRole("heading", { name: "Your Àjọ passport" });
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });
});

describe("someone already decided on while the partner is not connected", () => {
  it("still shows their result, rather than hiding it behind the lock", async () => {
    api({ ...previewState("approved", "NG"), connected: false });
    screenOf();
    expect(await screen.findByText("Passport approved")).toBeInTheDocument();
    expect(screen.getByText(/isn.t switched on yet/i)).toBeInTheDocument();
  });
});

describe("approval given without the identity checks", () => {
  const note =
    "Your account was approved without the identity checks, which are not switched on yet.";

  it("says so, instead of congratulating on a passport nobody checked", async () => {
    api({ status: "approved", tier: 1, via: "waived", note });
    screenOf();
    expect(await screen.findByText("Approved for now")).toBeInTheDocument();
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(screen.queryByText("Passport approved")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add your BVN" })).not.toBeInTheDocument();
  });

  it("tells someone on hold, with the reason in words, and offers no retry that cannot help", async () => {
    const hold = "Your verification is on hold. Please contact support.";
    api({ status: "rejected", tier: 0, via: "hold", note: hold });
    screenOf();
    expect(await screen.findByText("Your verification is on hold")).toBeInTheDocument();
    expect(screen.getByText(hold)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.queryByText("A stamp needs another try")).not.toBeInTheDocument();
  });
});

describe("the passport once partners are connected", () => {
  it("invites a new person to start, and leads to the first stamp", async () => {
    api({ connected: true });
    screenOf();
    expect(await screen.findByText("Start your passport")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/verify/id");
    expect(screen.queryByText(/isn.t switched on yet/i)).not.toBeInTheDocument();
  });

  it("says how far along someone is, and leads to the next stamp", async () => {
    api({ ...previewState("waiting", "NG"), connected: true });
    screenOf();
    expect(await screen.findByText(/2 of 5 stamped/)).toBeInTheDocument();
    expect(screen.getByText(/We.re checking/)).toBeInTheDocument();
  });

  it("congratulates, and says what is now open", async () => {
    api({ ...previewState("approved", "NG"), connected: true });
    screenOf();
    expect(await screen.findByText("Passport approved")).toBeInTheDocument();
    expect(screen.getByText(/saving, joining circles and adding friends/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your BVN" })).toHaveAttribute(
      "href",
      "/verify/national_check",
    );
  });

  it("does not offer the BVN to someone in the UK, or who has already added it", async () => {
    api({ ...previewState("approved", "GB"), connected: true }, { ...me, country: "GB" });
    const { unmount } = screenOf();
    await screen.findByText("Passport approved");
    expect(screen.queryByRole("link", { name: "Add your BVN" })).not.toBeInTheDocument();
    unmount();
    api({ ...previewState("approved_plus", "NG"), connected: true });
    screenOf();
    await screen.findByText("Passport approved");
    expect(screen.queryByRole("link", { name: "Add your BVN" })).not.toBeInTheDocument();
  });

  it("says what to fix, in words, and goes straight back to that stamp", async () => {
    api({ ...previewState("refused", "NG"), connected: true });
    screenOf();
    expect(await screen.findByText(/The photo was too dark/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/verify/selfie",
    );
  });

  it("explains a failure to load, and tries again", async () => {
    api("fail");
    const user = userEvent.setup();
    screenOf();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your verification/);
    await user.click(screen.getByRole("button", { name: "Try again" }));
  });

  it("sends a signed-out person to sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/me" ? Response.json(me) : new Response(null, { status: 401 }),
      ),
    );
    screenOf();
    await screen.findByText("Loading…");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});

describe("the preview", () => {
  beforeEach(() => {
    query = new URLSearchParams("preview=1");
  });

  it("says it is a preview, never asks the API for progress, and opens every stamp", async () => {
    api({});
    screenOf();
    expect(await screen.findByText(/Preview: nothing here is saved or sent/)).toBeInTheDocument();
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([url]) => url);
    expect(calls).not.toContain("/api/kyc");
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/verify/id?preview=1",
    );
    expect(screen.queryByText(/isn.t switched on yet/i)).not.toBeInTheDocument();
  });

  it("lets a reviewer look at each outcome", async () => {
    api({});
    const user = userEvent.setup();
    screenOf();
    await screen.findByText(/Preview: nothing here is saved or sent/);
    await user.click(screen.getByRole("button", { name: "Approved" }));
    expect(await screen.findByText("Passport approved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refused" }));
    expect(await screen.findByText(/The photo was too dark/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Waiting" }));
    expect(await screen.findByText(/We.re checking/)).toBeInTheDocument();
  });

  it("leaves the preview through a link that drops it", async () => {
    api({});
    screenOf();
    expect(await screen.findByRole("link", { name: "Exit preview" })).toHaveAttribute(
      "href",
      "/verify",
    );
  });
});
