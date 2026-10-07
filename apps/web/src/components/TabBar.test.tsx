import { render, screen } from "@testing-library/react";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
  it("has five equal destinations and no raised button", () => {
    render(<TabBar current="/circles" />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual(
      [
        ["Home", "/today"],
        ["Save", "/save"],
        ["Circles", "/circles"],
        ["Wallet", "/wallet"],
        ["Me", "/me"],
      ],
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("marks the current section, including pages inside it, and only that one", () => {
    render(<TabBar current="/circles/aso-ebi" />);
    expect(screen.getByRole("link", { name: "Circles" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link").filter((l) => l.hasAttribute("aria-current"))).toHaveLength(
      1,
    );
  });

  it("does not light Wallet for a path that only starts with the same letters", () => {
    render(<TabBar current="/walletx" />);
    expect(screen.getByRole("link", { name: "Wallet" })).not.toHaveAttribute("aria-current");
  });
});
