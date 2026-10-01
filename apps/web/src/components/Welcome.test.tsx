import { render, screen } from "@testing-library/react";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("names the product and its promise", () => {
    render(<Welcome />);
    expect(screen.getByRole("heading", { level: 1, name: "Àjọ" })).toBeInTheDocument();
    expect(screen.getByText("Save together, with people you trust.")).toBeInTheDocument();
  });

  it("shows the circle, since that is what Àjọ is", () => {
    render(<Welcome />);
    expect(screen.getByRole("img", { name: /receives this round/ })).toBeInTheDocument();
  });

  it("offers creating an account first, then signing in", () => {
    render(<Welcome />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Create account", "/sign-up"],
      ["Sign in", "/sign-in"],
    ]);
  });

  it("does not promise interest", () => {
    render(<Welcome />);
    expect(screen.queryByText(/interest|earn|returns/i)).not.toBeInTheDocument();
  });
});
