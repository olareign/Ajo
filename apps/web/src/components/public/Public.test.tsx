import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { HelpCenter } from "@/components/help/HelpCenter";
import { HELP_TOPICS } from "@/components/help/help-topics";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { PRIVACY, PRIVACY_INTRO } from "@/components/legal/legal-texts";
import { NOTICE_KEY, NOTICE_VERSION, PrivacyNotice } from "@/components/PrivacyNotice";
import { Landing } from "@/components/Landing";
import { FACTS, FIRST_QUESTIONS, MISSED } from "./facts";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { RoundPlayer } from "./RoundPlayer";

let path = "/";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/site-contact", () => ({ supportEmail: async () => "help@ajo.test" }));
// The shell fetches the support email (async); here it simply draws the page.
vi.mock("./PublicShell", async (original) => ({
  ...(await original<typeof import("./PublicShell")>()),
  PublicShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

afterEach(() => {
  path = "/";
  localStorage.clear();
});

describe("the landing page", () => {
  it("leads with saving together safely, has both ways in, and answers the first questions", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Save together, safely.");
    const joins = screen.getAllByRole("link", { name: /Create your account/ });
    expect(joins.length).toBeGreaterThan(1);
    for (const link of joins) expect(link).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "How a circle works" })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
    expect(
      screen.getByRole("heading", { name: /what if someone doesn.t pay\?/i }),
    ).toBeInTheDocument();
    for (const { q } of FIRST_QUESTIONS) expect(screen.getByText(q)).toBeInTheDocument();
  });

  it("says plainly what happens on each day of a missed payment, with the real numbers", () => {
    render(<Landing />);
    for (const step of MISSED) expect(screen.getByText(step.when)).toBeInTheDocument();
    expect(screen.getByText(`Day ${FACTS.graceDays + 1}`)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`for ${FACTS.pauseDays} days`)).length).toBeGreaterThan(
      0,
    );
  });
});

describe("the public pages' words", () => {
  // Promises the app can't keep, and stock phrases that say nothing. If one comes back, a person
  // reading the page is being told something untrue or empty.
  const BANNED = [
    /guarantee/i,
    /100%/,
    /biometric/i,
    /24\/7/,
    /all systems operational/i,
    /bank-grade/i,
    /zero (default|risk)/i,
    /seamless/i,
    /democratiz/i,
    /world-class/i,
    /cryptographic/i,
    /faster payments/i,
  ];
  const ROOT = join(process.cwd(), "src");
  const files = [
    "components/Landing.tsx",
    "components/PrivacyNotice.tsx",
    "components/auth/AuthScreen.tsx",
    "app/about/page.tsx",
    "app/safety/page.tsx",
    "app/how-it-works/page.tsx",
    "app/help/page.tsx",
    ...readdirSync(join(ROOT, "components/public"))
      .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))
      .map((f) => `components/public/${f}`),
    ...readdirSync(join(ROOT, "components/help"))
      .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))
      .map((f) => `components/help/${f}`),
  ];

  it.each(files)("%s promises nothing the app can't keep", (file) => {
    expect(statSync(join(ROOT, file)).isFile()).toBe(true);
    const text = readFileSync(join(ROOT, file), "utf8");
    for (const phrase of BANNED) expect(text).not.toMatch(phrase);
  });

  it("is honest that a member with a good record has no deposit to cover a miss", () => {
    const missed = FIRST_QUESTIONS.find((f) => f.q.startsWith("What if someone"))!.a;
    expect(missed).toMatch(/don't put a deposit down/);
    expect(missed).toMatch(/pays what came in/);
  });
});

describe("the round player", () => {
  it("moves round by round, and the pot goes to whoever's turn it is", async () => {
    const user = userEvent.setup();
    render(<RoundPlayer />);
    const receipt = screen.getByRole("figure", { name: /ROUND 3 OF 8/ });
    expect(within(receipt).getByText("To Funmi Ojo")).toBeInTheDocument();
    expect(within(receipt).getByText("₦200,000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next round" }));
    expect(screen.getByRole("figure", { name: /ROUND 4 OF 8/ })).toHaveTextContent("To Chidi Obi");
    expect(screen.getByRole("button", { name: "Round 4: Chidi Obi" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("shows a deposit covering a short wallet in round five", async () => {
    const user = userEvent.setup();
    render(<RoundPlayer />);
    await user.click(screen.getByRole("button", { name: "Round 5: Kemi Adams" }));
    const receipt = screen.getByRole("figure", { name: /ROUND 5 OF 8/ });
    expect(within(receipt).getByText("Segun's deposit")).toBeInTheDocument();
    expect(receipt).toHaveTextContent(/Their deposit paid their share/);
  });

  it("switches to pounds and its own amounts, and can't step past either end", async () => {
    const user = userEvent.setup();
    render(<RoundPlayer />);
    await user.click(screen.getByRole("radio", { name: "£ Pounds" }));
    expect(screen.getByRole("radio", { name: "£100" })).toBeChecked();
    expect(screen.getByRole("figure", { name: /ROUND 3/ })).toHaveTextContent("£800");
    await user.click(screen.getByRole("button", { name: "Round 1: Adébáyọ̀ Ola" }));
    expect(screen.getByRole("button", { name: "Previous round" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Round 8: Ada Eze" }));
    expect(screen.getByRole("button", { name: "Next round" })).toBeDisabled();
    expect(screen.getByText(/deposits go back/)).toBeInTheDocument();
  });
});

describe("the header and footer", () => {
  it("marks the page you're on and opens a menu on a small screen that closes when you follow a link", async () => {
    path = "/safety";
    const user = userEvent.setup();
    render(<PublicHeader />);
    expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = document.getElementById("public-menu")!;
    await user.click(within(menu).getByRole("link", { name: "Help" }));
    expect(document.getElementById("public-menu")).toBeNull();
  });

  it("shows the support address it's given, and links the fine print", () => {
    render(<PublicFooter supportEmail="help@ajo.test" />);
    expect(screen.getByRole("link", { name: "help@ajo.test" })).toHaveAttribute(
      "href",
      "mailto:help@ajo.test",
    );
    expect(screen.getByRole("link", { name: "Cookies" })).toHaveAttribute(
      "href",
      "/privacy#cookies",
    );
    expect(screen.getByText(/drafts while a lawyer reviews them/)).toBeInTheDocument();
  });
});

describe("help", () => {
  it("finds answers by any words in them, ignoring accents, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<HelpCenter topics={HELP_TOPICS} supportEmail="help@ajo.test" />);
    const search = screen.getByRole("searchbox", { name: "Search help" });
    await user.type(search, "esusu");
    expect(screen.getByText("What is an èsúsú circle?")).toBeInTheDocument();
    expect(screen.queryByText("I forgot my transaction PIN")).toBeNull();
    await user.clear(search);
    await user.type(search, "zzzz");
    expect(screen.getByText(/Nothing matches that/)).toBeInTheDocument();
  });

  it("reaches a person at the address staff set, and warns about anyone asking for codes", () => {
    render(<HelpCenter topics={HELP_TOPICS} supportEmail="help@ajo.test" />);
    expect(screen.getByRole("link", { name: "help@ajo.test" })).toHaveAttribute(
      "href",
      "mailto:help@ajo.test?subject=%C3%80j%E1%BB%8D%20help",
    );
    expect(
      screen.getByText(/never ask for your password, PIN or authenticator codes/),
    ).toBeInTheDocument();
  });
});

describe("the privacy notice page", () => {
  it("is a draft, dated, numbered, and has a cookies section the pop-up links to", async () => {
    render(await LegalDoc({ title: "Privacy notice", intro: PRIVACY_INTRO, sections: PRIVACY }));
    expect(screen.getByRole("note")).toHaveTextContent("Draft, under legal review.");
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    const cookies = document.getElementById("cookies")!;
    expect(within(cookies).getByRole("heading")).toHaveTextContent(
      /\d\. Cookies and storage on your device/,
    );
    expect(cookies).toHaveTextContent("We don't use advertising cookies");
    expect(screen.getByRole("link", { name: "help@ajo.test" })).toBeInTheDocument();
  });
});

describe("the privacy pop-up", () => {
  it("shows once, says what's kept and links to the notice, then stays away", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PrivacyNotice />);
    const notice = screen.getByRole("region", { name: "Cookies and your privacy" });
    expect(notice).toHaveTextContent("No ads, no tracking.");
    expect(within(notice).getByRole("link", { name: "Privacy notice" })).toHaveAttribute(
      "href",
      "/privacy#cookies",
    );
    await user.click(within(notice).getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("region", { name: "Cookies and your privacy" })).toBeNull();
    expect(localStorage.getItem(NOTICE_KEY)).toBe(NOTICE_VERSION);
    unmount();
    render(<PrivacyNotice />);
    expect(screen.queryByRole("region", { name: "Cookies and your privacy" })).toBeNull();
  });

  it("shows again when what it says changes", () => {
    localStorage.setItem(NOTICE_KEY, "an-older-version");
    render(<PrivacyNotice />);
    expect(screen.getByRole("region", { name: "Cookies and your privacy" })).toBeInTheDocument();
  });

  it("sits clear of the bottom bar inside the app, and of a phone's bottom buttons elsewhere", () => {
    path = "/today";
    const { unmount } = render(<PrivacyNotice />);
    expect(screen.getByRole("region").className).toContain("5.75rem");
    unmount();
    path = "/";
    render(<PrivacyNotice />);
    expect(screen.getByRole("region").className).toContain("top-[max(");
  });
});
