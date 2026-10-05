import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePicker } from "./AppearancePicker";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("AppearancePicker", () => {
  it("starts on System, and switches the page to the choice", async () => {
    const user = userEvent.setup();
    render(<AppearancePicker />);
    const group = screen.getByRole("radiogroup", { name: "Appearance" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("shows the remembered choice, and moves with the arrow keys", async () => {
    // As the head script leaves the page after reading the stored choice.
    localStorage.setItem("ajo-theme", "light");
    document.documentElement.dataset.theme = "light";
    const user = userEvent.setup();
    render(<AppearancePicker />);
    const light = await screen.findByRole("radio", { name: "Light", checked: true });
    light.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
