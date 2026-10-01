import { render, screen } from "@testing-library/react";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  it("is the page's one main area, holding the content and the footer line", () => {
    render(
      <AuthScreen footer={<p>Don&apos;t have an account?</p>}>
        <h1>Hi there</h1>
      </AuthScreen>,
    );
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("heading", { name: "Hi there" }));
    expect(main).toContainElement(screen.getByText("Don't have an account?"));
  });

  it("fills the screen so the footer sits at the bottom, with room for the home bar", () => {
    render(<AuthScreen>x</AuthScreen>);
    const cls = screen.getByRole("main").className;
    expect(cls).toContain("min-h-dvh");
    expect(cls).toContain("flex-col");
    expect(cls).toContain("env(safe-area-inset-bottom)");
  });

  it("draws the bead corner as decoration only", () => {
    const { container } = render(<AuthScreen>x</AuthScreen>);
    const art = container.querySelector("svg[data-corner]");
    expect(art).toHaveAttribute("aria-hidden", "true");
    expect(art?.textContent).toBe("");
  });
});
