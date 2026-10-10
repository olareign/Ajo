import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopDashboardMockup } from "./DesktopDashboardMockup";

describe("DesktopDashboardMockup", () => {
  it("renders the simulated desktop workspace with default NGN currency and 50,000 preset", () => {
    render(<DesktopDashboardMockup />);

    expect(screen.getByText("Overview & Circle Board")).toBeInTheDocument();
    expect(screen.getAllByText("₦400,000").length).toBeGreaterThanOrEqual(1); // 8 * 50,000
    expect(screen.getByRole("radio", { name: "₦ NGN" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches currency to GBP and recalculates total pot", async () => {
    const user = userEvent.setup();
    render(<DesktopDashboardMockup />);

    const gbpRadio = screen.getByRole("radio", { name: "£ GBP" });
    await user.click(gbpRadio);

    expect(gbpRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("£800").length).toBeGreaterThanOrEqual(1); // 8 * 100
  });

  it("updates pot amount when clicking a preset contribution button", async () => {
    const user = userEvent.setup();
    render(<DesktopDashboardMockup />);

    const preset100k = screen.getByRole("button", { name: "₦100,000" });
    await user.click(preset100k);

    expect(screen.getAllByText("₦800,000").length).toBeGreaterThanOrEqual(1); // 8 * 100,000
  });

  it("switches inspected turn and updates the recipient spotlight", async () => {
    const user = userEvent.setup();
    render(<DesktopDashboardMockup />);

    const turn1 = screen.getByRole("tab", { name: /Select Turn 1/ });
    await user.click(turn1);

    expect(screen.getAllByText(/Adébáyọ̀ Ola/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Turn 1 of 8")).toBeInTheDocument();
  });

  it("simulates missed payment and triggers the deposit reserve coverage notice", async () => {
    const user = userEvent.setup();
    render(<DesktopDashboardMockup />);

    const toggle = screen.getByRole("switch", { name: "Simulate missed payment" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Auto-covered:/)).toBeInTheDocument();
  });
});
