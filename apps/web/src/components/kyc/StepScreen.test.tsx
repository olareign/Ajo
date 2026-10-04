import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { previewState } from "@/lib/kyc";
import { KycFlow } from "./KycFlow";
import { StepScreen } from "./StepScreen";

const replace = vi.fn();
const router = { replace, push: replace };
let query = new URLSearchParams("preview=1");
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => query,
}));
// The pretend check is instant in a test.
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
};

function api(profile: object = me, kyc: object = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/me") return Response.json(profile);
      if (url === "/api/kyc") return Response.json(kyc);
      return new Response(null, { status: 404 });
    }),
  );
}
const open = (step: string) =>
  render(
    <KycFlow>
      <StepScreen step={step} />
    </KycFlow>,
  );

beforeEach(() => {
  query = new URLSearchParams("preview=1");
  sessionStorage.clear();
  api();
});
afterEach(() => vi.unstubAllGlobals());

describe("the ID stamp", () => {
  it("asks which ID, then its number, and stamps it, leading on to the face", async () => {
    const user = userEvent.setup();
    open("id");
    await user.click(await screen.findByRole("radio", { name: /National ID/ }));
    const send = screen.getByRole("button", { name: "Check my ID" });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText("NIN"), "12345678901");
    await user.click(send);

    expect(await screen.findByRole("heading", { name: "Your ID stamped" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Your ID: approved" })).toHaveClass("stamp-thunk");
    expect(screen.getByRole("link", { name: "Next: Your face" })).toHaveAttribute(
      "href",
      "/verify/selfie?preview=1",
    );
  });

  it("offers a country's own IDs, and checks the number before sending", async () => {
    api({ ...me, country: "GB" });
    const user = userEvent.setup();
    open("id");
    await screen.findByRole("radio", { name: /Passport/ });
    expect(screen.queryByRole("radio", { name: /National ID/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Passport/ }));
    await user.type(screen.getByLabelText("Passport number"), "12345");
    expect(screen.getByRole("button", { name: "Check my ID" })).toBeDisabled();
  });

  it("says what went wrong and stays put when the check refuses", async () => {
    const user = userEvent.setup();
    open("id");
    await user.click(await screen.findByRole("radio", { name: /National ID/ }));
    await user.type(screen.getByLabelText("NIN"), "12345670000");
    await user.click(screen.getByRole("button", { name: "Check my ID" }));
    expect(await screen.findByText(/couldn.t match that ID/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your ID stamped" })).not.toBeInTheDocument();
  });
});

describe("the face stamp", () => {
  it("walks through the three movements, then stamps", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open("selfie");
    await user.click(await screen.findByRole("button", { name: "I'm ready" }));
    expect(screen.getByRole("status")).toHaveTextContent("Look straight at the camera");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Slowly turn your head left");
    // Each movement's timer only starts after the screen has updated, so step through them one by one.
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1400);
      });
    }
    expect(await screen.findByRole("heading", { name: "Your face stamped" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("never asks for the camera in a preview", async () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
    open("selfie");
    await screen.findByRole("button", { name: "I'm ready" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe("the address stamp", () => {
  it("takes a document type and a file, shows only its name, and stamps", async () => {
    const user = userEvent.setup();
    open("address");
    await user.click(await screen.findByRole("radio", { name: /Bank statement/ }));
    const send = screen.getByRole("button", { name: "Send document" });
    expect(send).toBeDisabled();
    await user.upload(
      screen.getByLabelText(/Choose a photo or PDF/),
      new File(["x"], "statement.pdf", { type: "application/pdf" }),
    );
    expect(screen.getByText("statement.pdf")).toBeInTheDocument();
    await user.click(send);
    expect(
      await screen.findByRole("heading", { name: "Your address stamped" }),
    ).toBeInTheDocument();
  });

  it("refuses a document that is hard to read, and says how to fix it", async () => {
    const user = userEvent.setup();
    open("address");
    await user.click(await screen.findByRole("radio", { name: /Bank statement/ }));
    await user.upload(
      screen.getByLabelText(/Choose a photo or PDF/),
      new File(["x"], "blurry-bill.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("button", { name: "Send document" }));
    expect(await screen.findByText(/hard to read/)).toBeInTheDocument();
  });
});

describe("the area stamp", () => {
  it("explains what is kept, shows a sample area without asking the browser, and stamps", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const user = userEvent.setup();
    open("location");
    expect(await screen.findByText(/stored encrypted/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Share my location" }));
    expect(screen.getByText("Ikeja, Lagos")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this area" }));
    expect(await screen.findByRole("heading", { name: "Your area stamped" })).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("uses the UK's sample area for a UK member", async () => {
    api({ ...me, country: "GB" });
    const user = userEvent.setup();
    open("location");
    await user.click(await screen.findByRole("button", { name: "Share my location" }));
    expect(screen.getByText("Hackney, London")).toBeInTheDocument();
  });
});

describe("the bank stamp", () => {
  it("looks up the account's name, shows that it matches, and stamps", async () => {
    const user = userEvent.setup();
    open("bank");
    await user.selectOptions(await screen.findByLabelText("Bank"), "058");
    await user.type(screen.getByLabelText("Account number"), "0123456789");
    await user.click(screen.getByRole("button", { name: "Check the name" }));
    expect(await screen.findByText("ADA OLA")).toBeInTheDocument();
    expect(screen.getByText(/matches your ID/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use this account" }));
    expect(await screen.findByRole("heading", { name: "Your bank stamped" })).toBeInTheDocument();
    // Other stamps are still empty, so it leads on to the first of them.
    expect(screen.getByRole("link", { name: "Next: Your ID" })).toHaveAttribute(
      "href",
      "/verify/id?preview=1",
    );
  });

  it("will not use an account that is in someone else's name", async () => {
    const user = userEvent.setup();
    open("bank");
    await user.selectOptions(await screen.findByLabelText("Bank"), "058");
    await user.type(screen.getByLabelText("Account number"), "0123450000");
    await user.click(screen.getByRole("button", { name: "Check the name" }));
    expect(await screen.findByText("CHIDI OKAFOR")).toBeInTheDocument();
    expect(screen.getByText(/doesn.t match your ID/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use this account" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use a different account" }));
    expect(screen.getByRole("button", { name: "Check the name" })).toBeInTheDocument();
  });

  it("asks a UK member for a sort code, not a bank", async () => {
    api({ ...me, country: "GB" });
    const user = userEvent.setup();
    open("bank");
    await user.type(await screen.findByLabelText("Sort code"), "12-34-56");
    await user.type(screen.getByLabelText("Account number"), "12345678");
    expect(screen.queryByLabelText("Bank")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check the name" })).toBeEnabled();
  });
});

describe("the BVN stamp", () => {
  it("is optional, explains what BVN does not give away, and stamps", async () => {
    const user = userEvent.setup();
    open("national_check");
    expect(await screen.findByText(/never see your balance/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("BVN"), "22334455667");
    await user.click(screen.getByRole("button", { name: "Add my BVN" }));
    expect(await screen.findByRole("heading", { name: "Your BVN stamped" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See my passport" })).toBeInTheDocument();
  });

  it("is not offered in the UK", async () => {
    api({ ...me, country: "GB" });
    open("national_check");
    expect(await screen.findByText(/isn.t here/)).toBeInTheDocument();
  });
});

describe("outside a preview, before a partner is connected", () => {
  beforeEach(() => {
    query = new URLSearchParams();
    api(me, { ...previewState("fresh", "NG"), connected: false });
  });

  it("shows the stamp locked, with no form, and a way to preview just that step", async () => {
    open("id");
    expect(await screen.findByText("Not switched on yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check my ID" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview this step" })).toHaveAttribute(
      "href",
      "/verify/id?preview=1",
    );
    const panel = screen.getByText("Not switched on yet").closest("div")!;
    expect(within(panel).getByRole("img", { name: /not stamped yet/ })).toBeInTheDocument();
  });

  it("does not know a step that does not exist", async () => {
    open("hair_colour");
    expect(await screen.findByText(/isn.t here/)).toBeInTheDocument();
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
  });
});
