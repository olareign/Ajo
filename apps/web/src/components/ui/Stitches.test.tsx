import { render, screen } from "@testing-library/react";
import { Stitches } from "./Stitches";

describe("Stitches", () => {
  it("reports progress through steps to assistive technology", () => {
    render(<Stitches total={5} done={2} label="Verify your identity" caption="Step 3 of 5 · Selfie" />);
    const bar = screen.getByRole("progressbar", { name: "Verify your identity" });
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
    expect(bar).toHaveAttribute("aria-valuetext", "Step 3 of 5");
    expect(screen.getByText("Step 3 of 5 · Selfie")).toBeInTheDocument();
  });

  it("draws one stitch per step and never overflows", () => {
    const { container } = render(<Stitches total={4} done={9} label="Rounds" />);
    expect(container.querySelectorAll("[data-stitch]")).toHaveLength(4);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  });
});
