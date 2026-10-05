import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
  it("has four destinations and the gold action in the middle", () => {
    render(<TabBar current="/circles" />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Home",
      "Save",
      "Circles",
      "Me",
    ]);
    expect(
      screen.getByRole("button", { name: "Quick actions: add money, save or start a circle" }),
    ).toBeInTheDocument();
  });

  it("marks the current section, including pages inside it", () => {
    render(<TabBar current="/circles/aso-ebi" />);
    expect(screen.getByRole("link", { name: "Circles" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens the action sheet", async () => {
    const onAction = vi.fn();
    render(<TabBar current="/today" onAction={onAction} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Quick actions: add money, save or start a circle" }),
    );
    expect(onAction).toHaveBeenCalledOnce();
  });
});
