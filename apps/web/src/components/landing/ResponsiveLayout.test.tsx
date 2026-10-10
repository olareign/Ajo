import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Landing } from "@/components/Landing";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { AuthScreen } from "@/components/auth/AuthScreen";

describe("Responsive UI & Layout Suite", () => {
  it("renders LandingHeader with desktop navigation and interactive mobile drawer", async () => {
    const user = userEvent.setup();
    render(<LandingHeader />);

    // Check desktop navigation landmark
    expect(screen.getByRole("navigation", { name: "Landing" })).toBeInTheDocument();

    // Check mobile menu trigger button
    const menuBtn = screen.getByRole("button", { name: "Open navigation menu" });
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute("aria-expanded", "false");

    // Open mobile menu
    await user.click(menuBtn);
    expect(menuBtn).toHaveAttribute("aria-expanded", "true");

    // In drawer, links to multi-page routes are present
    const howItWorksLinks = screen.getAllByRole("link", { name: /How it works/i });
    expect(howItWorksLinks.length).toBeGreaterThanOrEqual(1);

    const safetyLinks = screen.getAllByRole("link", { name: /Safety & Trust/i });
    expect(safetyLinks.length).toBeGreaterThanOrEqual(1);

    const aboutLinks = screen.getAllByRole("link", { name: /About/i });
    expect(aboutLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the comprehensive institutional LandingFooter with all product and legal links", () => {
    render(<LandingFooter />);

    expect(screen.getByText("Nigeria · United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Deposit Protection")).toBeInTheDocument();
    expect(screen.getByText("Two Locks on Your Money")).toBeInTheDocument();
    expect(screen.getByText(/drafts while a lawyer reviews them/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Èsúsú Circles" })).toHaveAttribute(
      "href",
      "/how-it-works",
    );
    expect(screen.getByRole("link", { name: "Deposit Reserve Shield" })).toHaveAttribute(
      "href",
      "/safety",
    );
    expect(screen.getByRole("link", { name: "About Àjọ" })).toHaveAttribute("href", "/about");
    expect(screen.getAllByRole("link", { name: "Privacy" })[0]).toHaveAttribute("href", "/privacy");
  });

  it("renders AuthScreen with mobile backwards-compatibility and desktop showcase panel", () => {
    render(
      <AuthScreen footer={<p>Don&apos;t have an account?</p>}>
        <h2>Sign In Form Header</h2>
      </AuthScreen>,
    );

    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("heading", { name: "Sign In Form Header" }));
    expect(main).toContainElement(screen.getByText("Don't have an account?"));

    // Verify desktop showcase elements are present in the DOM
    expect(screen.getByText("Institutional Trust")).toBeInTheDocument();
    expect(screen.getByText("Sample Circle of Eight")).toBeInTheDocument();
    expect(screen.queryByText(/Circle Saver/i)).toBeNull(); // no made-up customer quotes
  });

  it("renders the redesigned Landing page with background SVGs and responsive hierarchy", () => {
    const { container } = render(<Landing />);

    // Verify background decorations exist
    expect(container.querySelector("svg pattern")).toBeInTheDocument();

    // Verify main landmarks and headings
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Save together, safely.");
    expect(screen.getByRole("heading", { name: "How a circle works" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /missed payment doesn.t sink the round/i }),
    ).toBeInTheDocument();
  });
});
