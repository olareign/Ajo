import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyTheme } from "@/lib/theme";
import { ThemeModeToggle } from "./ThemeModeToggle";

describe("ThemeModeToggle", () => {
  afterEach(() => {
    applyTheme("system");
  });

  it("renders the theme switcher and toggles between light and dark modes", async () => {
    applyTheme("light");
    const user = userEvent.setup();
    await act(async () => {
      render(<ThemeModeToggle />);
    });

    const button = screen.getByRole("switch");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-checked", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(button);
    expect(button).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
