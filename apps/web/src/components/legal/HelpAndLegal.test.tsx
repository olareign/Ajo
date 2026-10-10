import { render, screen, within } from "@testing-library/react";
import { HelpScreen } from "./HelpScreen";
import { LegalDoc } from "./LegalDoc";
import { PRIVACY, PRIVACY_INTRO, TERMS, TERMS_INTRO } from "./legal-texts";

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() };
const SUPPORT_EMAIL = "help@ajo.test";
vi.mock("server-only", () => ({}));
vi.mock("@/server/site-contact", () => ({ supportEmail: async () => SUPPORT_EMAIL }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("Help", () => {
  it("offers the support email with a subject, warns about phishing, and links the fine print", () => {
    render(<HelpScreen supportEmail={SUPPORT_EMAIL} />);
    const email = screen.getByRole("link", { name: /Email us/ });
    expect(email).toHaveAttribute(
      "href",
      `mailto:${SUPPORT_EMAIL}?subject=%C3%80j%E1%BB%8D%20help`,
    );
    expect(
      screen.getByText(/will never ask for your password, PIN or authenticator codes/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Terms of use/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /Privacy notice/ })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("answers the common questions, folded until opened", () => {
    render(<HelpScreen supportEmail={SUPPORT_EMAIL} />);
    const answers = screen.getByRole("region", { name: "Quick answers" });
    expect(within(answers).getByText("I forgot my transaction PIN")).toBeInTheDocument();
    expect(within(answers).getByText(/choose Reset/)).not.toBeVisible();
  });
});

describe("terms and privacy", () => {
  it.each([
    ["Terms of use", TERMS_INTRO, TERMS],
    ["Privacy notice", PRIVACY_INTRO, PRIVACY],
  ] as const)(
    "%s says it is a draft, is dated, and numbers its sections",
    async (title, intro, sections) => {
      render(await LegalDoc({ title, intro, sections }));
      expect(screen.getByRole("note")).toHaveTextContent("Draft, under legal review.");
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: `1. ${sections[0]!.heading}` }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toBeInTheDocument();
    },
  );

  it("the privacy notice never claims we sell data or keep originals of secrets", () => {
    const text = PRIVACY.flatMap((s) => s.body).join(" ");
    expect(text).toContain("We do not sell your information");
    expect(text).toContain("never the originals");
  });
});

describe("cookies", () => {
  it("has a cookies section the privacy pop-up links to, saying nothing tracks you", async () => {
    render(await LegalDoc({ title: "Privacy notice", intro: PRIVACY_INTRO, sections: PRIVACY }));
    const cookies = document.getElementById("cookies")!;
    expect(cookies).toHaveTextContent("Cookies and storage on your device");
    expect(cookies).toHaveTextContent("We don't use advertising cookies");
  });
});
