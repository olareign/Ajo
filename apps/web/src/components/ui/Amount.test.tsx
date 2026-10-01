import { render, screen } from "@testing-library/react";
import { Amount } from "./Amount";

describe("Amount", () => {
  it("formats integer minor units from the API exactly", () => {
    render(<Amount amount="7000000" currency="NGN" locale="en-NG" />);
    expect(screen.getByText("₦70,000")).toBeInTheDocument();
  });

  it("shows a dash instead of a wrong number for malformed data", () => {
    render(<Amount amount="12.5" currency="NGN" locale="en-NG" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("marks money coming to the member with the gold tone", () => {
    render(<Amount amount="125000" currency="GBP" locale="en-GB" tone="oro" size="m" />);
    const el = screen.getByText("£1,250");
    expect(el).toHaveAttribute("data-tone", "oro");
    expect(el).toHaveAttribute("data-size", "m");
  });
});
