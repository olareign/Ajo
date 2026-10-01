import { money } from "@ajo/domain";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SoloPlanWizard } from "./SoloPlanWizard";

function setup() {
  const onCreate = vi.fn();
  const user = userEvent.setup();
  render(<SoloPlanWizard currency="NGN" locale="en-NG" today="2026-10-05" onCreate={onCreate} />);
  const proceed = () => screen.getByRole("button", { name: "Proceed" });
  return { user, onCreate, proceed };
}

describe("SoloPlanWizard", () => {
  it("creates a weekly plan for a year and celebrates", async () => {
    const { user, onCreate, proceed } = setup();

    expect(screen.getByRole("heading", { name: "What are you saving for?" })).toBeInTheDocument();
    expect(proceed()).toBeDisabled();
    await user.type(screen.getByLabelText("Plan Name"), "Aso Ebi");
    await user.click(proceed());

    expect(
      screen.getByRole("heading", { name: "How much would you like to start with?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "5,000" }));
    expect(proceed()).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Weekly" }));
    await user.click(proceed());

    expect(
      screen.getByRole("heading", { name: "How long do you want to save for?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "1 year" }));
    await user.click(proceed());

    expect(screen.getByRole("heading", { name: "Your selections" })).toBeInTheDocument();
    const summary = screen.getByRole("list", { name: "Plan summary" });
    expect(summary).toHaveTextContent("Aso Ebi");
    expect(summary).toHaveTextContent("₦5,000 weekly");
    expect(summary).toHaveTextContent("Deposits53");
    expect(summary).toHaveTextContent("First debit5 Oct 2026");
    expect(summary).toHaveTextContent("Maturity date5 Oct 2027");
    expect(summary).toHaveTextContent("Estimated amount₦265,000");
    await user.click(proceed());

    expect(onCreate).toHaveBeenCalledWith({
      name: "Aso Ebi",
      amount: money(500_000, "NGN"),
      frequency: "weekly",
      duration: { unit: "months", count: 12 },
      startDate: "2026-10-05",
    });
    expect(screen.getByRole("heading", { name: "Nice one Boss!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to dashboard" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("lets the user type an amount and duration of their own", async () => {
    const { user, proceed } = setup();
    await user.type(screen.getByLabelText("Plan Name"), "Rent");
    await user.click(proceed());

    await user.click(screen.getByRole("radio", { name: "Specify Amount" }));
    await user.type(screen.getByLabelText("Amount (NGN)"), "12.345");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount like 5,000 or 5,000.50");
    await user.clear(screen.getByLabelText("Amount (NGN)"));
    await user.type(screen.getByLabelText("Amount (NGN)"), "7,500");
    await user.click(screen.getByRole("radio", { name: "Monthly" }));
    await user.click(proceed());

    await user.click(screen.getByRole("radio", { name: "Specify Duration" }));
    await user.type(screen.getByLabelText("Number of months"), "9");
    await user.click(proceed());

    expect(screen.getByRole("list", { name: "Plan summary" })).toHaveTextContent(
      "Estimated amount₦67,500",
    );
  });

  it("does not promise interest, which the product does not offer", async () => {
    const { user, proceed } = setup();
    await user.type(screen.getByLabelText("Plan Name"), "Rent");
    await user.click(proceed());
    await user.click(screen.getByRole("radio", { name: "5,000" }));
    await user.click(screen.getByRole("radio", { name: "Daily" }));
    await user.click(proceed());
    await user.click(screen.getByRole("radio", { name: "3 Months" }));
    await user.click(proceed());

    expect(screen.queryByText(/interest/i)).not.toBeInTheDocument();
  });

  it("keeps choices when the user goes back", async () => {
    const { user, proceed } = setup();
    await user.type(screen.getByLabelText("Plan Name"), "Aso Ebi");
    await user.click(proceed());
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Plan Name")).toHaveValue("Aso Ebi");
  });

  it("links back home from the first step", () => {
    setup();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });
});
