import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InteractiveCircleSimulator } from "./InteractiveCircleSimulator";

describe("InteractiveCircleSimulator", () => {
  it("renders with default NGN currency and 50,000 preset", () => {
    render(<InteractiveCircleSimulator />);

    expect(screen.getByText("Interactive Circle Simulator")).toBeInTheDocument();
    expect(screen.getAllByText("₦400,000").length).toBeGreaterThanOrEqual(1); // 8 * 50,000
    expect(screen.getByRole("radio", { name: "₦ NGN" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches to GBP currency and recalculates total pot", async () => {
    const user = userEvent.setup();
    render(<InteractiveCircleSimulator />);

    const gbpRadio = screen.getByRole("radio", { name: "£ GBP" });
    await user.click(gbpRadio);

    expect(gbpRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("£800").length).toBeGreaterThanOrEqual(1); // 8 * 100
  });

  it("updates total pot when clicking another contribution preset", async () => {
    const user = userEvent.setup();
    render(<InteractiveCircleSimulator />);

    const preset100k = screen.getByRole("button", { name: "₦100,000" });
    await user.click(preset100k);

    expect(screen.getAllByText("₦800,000").length).toBeGreaterThanOrEqual(1); // 8 * 100,000
  });

  it("changes selected turn when clicking a turn button", async () => {
    const user = userEvent.setup();
    render(<InteractiveCircleSimulator />);

    // Select Turn 1 (Adébáyọ̀ Ola)
    const turn1 = screen.getByRole("tab", { name: /Select Turn 1/ });
    await user.click(turn1);

    expect(screen.getByText("Adébáyọ̀ Ola")).toBeInTheDocument();
    expect(screen.getByText("Turn 1 of 8")).toBeInTheDocument();
  });

  it("simulates a missed payment and activates the deposit reserve guarantee", async () => {
    const user = userEvent.setup();
    render(<InteractiveCircleSimulator />);

    const toggle = screen.getByRole("switch", { name: "Simulate missed payment" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Covered automatically:/)).toBeInTheDocument();
  });
});
