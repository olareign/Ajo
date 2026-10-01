import { render, screen, waitFor } from "@testing-library/react";
import { MeGate } from "./MeGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});
const api = (status: number, body: object = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
const me = (onboarded: boolean) => ({ displayName: "Ada", email: "a@b.co", onboarded });

describe("MeGate", () => {
  it("shows its content to someone who is onboarded", async () => {
    api(200, me(true));
    render(<MeGate needs="onboarded">{(m) => <p>Hi {m.displayName}</p>}</MeGate>);
    expect(await screen.findByText("Hi Ada")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it("sends someone who has not finished onboarding to onboarding", async () => {
    api(200, me(false));
    render(<MeGate needs="onboarded">{() => <p>secret</p>}</MeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
  it("sends an onboarded person away from onboarding", async () => {
    api(200, me(true));
    render(<MeGate needs="not-onboarded">{() => <p>form</p>}</MeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
  });
  it("sends a signed-out person to sign in", async () => {
    api(401, { message: "Please sign in." });
    render(<MeGate needs="onboarded">{() => <p>secret</p>}</MeGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
  it("says so when the server cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    render(<MeGate needs="onboarded">{() => <p>secret</p>}</MeGate>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach/i);
  });
});
