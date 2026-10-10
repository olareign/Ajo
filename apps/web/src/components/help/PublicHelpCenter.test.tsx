import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicHelpCenter } from "./PublicHelpCenter";

describe("PublicHelpCenter", () => {
  it("renders the help center hero, search bar, and category filters", () => {
    render(<PublicHelpCenter supportEmail="help@ajo.test" />);

    expect(
      screen.getByRole("heading", { level: 1, name: /How can we help you today\?/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search topics/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All Questions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Èsúsú Circles/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Security & Deposits/i })).toBeInTheDocument();
  });

  it("filters questions when user types into the search input", async () => {
    const user = userEvent.setup();
    render(<PublicHelpCenter supportEmail="help@ajo.test" />);

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    await user.type(searchInput, "PIN");

    expect(screen.getByText("I forgot my transaction PIN. How do I reset it?")).toBeInTheDocument();
    expect(screen.queryByText("How does an Èsúsú circle work on Àjọ?")).not.toBeInTheDocument();
  });

  it("filters questions by category when clicking category tabs", async () => {
    const user = userEvent.setup();
    render(<PublicHelpCenter supportEmail="help@ajo.test" />);

    const currencyTab = screen.getByRole("tab", { name: /Multi-Currency/i });
    await user.click(currencyTab);

    expect(
      screen.getByText("Can members participate from the UK and Nigeria in different currencies?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("How does an Èsúsú circle work on Àjọ?")).not.toBeInTheDocument();
  });

  it("displays direct support contact and anti-phishing security warning", () => {
    render(<PublicHelpCenter supportEmail="help@ajo.test" />);

    expect(screen.getByText("help@ajo.test").closest("a")).toHaveAttribute(
      "href",
      "mailto:help@ajo.test?subject=%C3%80j%E1%BB%8D%20help",
    );
    expect(
      screen.getByText(/Àjọ will NEVER ask for your password, transaction PIN, or 2FA/i),
    ).toBeInTheDocument();
    const termsLinks = screen.getAllByRole("link", { name: /Terms of Service/i });
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
    expect(termsLinks[0]).toHaveAttribute("href", "/terms");

    const privacyLinks = screen.getAllByRole("link", { name: /Privacy Notice/i });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(privacyLinks[0]).toHaveAttribute("href", "/privacy");
  });
});
