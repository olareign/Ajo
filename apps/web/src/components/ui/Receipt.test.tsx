import { render, screen, within } from "@testing-library/react";
import { Receipt } from "./Receipt";

describe("Receipt", () => {
  it("states every term of a money action before it happens", () => {
    render(
      <Receipt
        title="You're paying"
        rows={[
          { label: "To", value: "Aso Ebi · round 3" },
          { label: "Fee", value: "₦0" },
        ]}
        total={{ label: "Total", value: "₦10,000" }}
      />,
    );
    const receipt = screen.getByRole("region", { name: "You're paying" });
    expect(within(receipt).getByText("To").nextSibling).toHaveTextContent("Aso Ebi · round 3");
    expect(within(receipt).getByText("Total").nextSibling).toHaveTextContent("₦10,000");
    expect(within(receipt).queryByText("Paid")).not.toBeInTheDocument();
  });

  it("is stamped with the result and its reference afterwards", () => {
    render(<Receipt title="Payment" rows={[]} stamp="Paid" reference="AJ-7Q2K-91XD" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("AJ-7Q2K-91XD")).toBeInTheDocument();
  });
});
