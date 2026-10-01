import { render, screen } from "@testing-library/react";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("has the four tabs from the designs", () => {
    render(<BottomNav current="/groups" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Home",
      "Groups",
      "Wallet",
      "More",
    ]);
  });

  it("marks the current section", () => {
    render(<BottomNav current="/groups/aso-ebi" />);
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});
