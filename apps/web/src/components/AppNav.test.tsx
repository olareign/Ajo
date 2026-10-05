import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppNav } from "./AppNav";

let path = "/today";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

describe("AppNav", () => {
  it("shows on the top screen of a section, and not inside a flow", () => {
    path = "/save";
    const first = render(<AppNav />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    first.unmount();
    path = "/wallet/add";
    render(<AppNav />);
    expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
  });

  it("opens the quick actions, leads to each, and closes with Escape", async () => {
    path = "/today";
    const user = userEvent.setup();
    render(<AppNav />);
    const action = screen.getByRole("button", { name: /Quick actions/ });
    await user.click(action);
    const sheet = screen.getByRole("dialog", { name: "What would you like to do?" });
    expect(action).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Add money" })).toHaveAttribute("href", "/wallet/add");
    expect(screen.getByRole("link", { name: "Add money" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Start a circle" })).toHaveAttribute(
      "href",
      "/circles/new",
    );
    expect(sheet).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
