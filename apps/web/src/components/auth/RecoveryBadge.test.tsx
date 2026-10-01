import { render } from "@testing-library/react";
import { RecoveryBadge } from "./RecoveryBadge";

describe("RecoveryBadge", () => {
  it("is a lock in a round badge, and decoration only", () => {
    const { container } = render(<RecoveryBadge />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg.lucide-lock")).toBeInTheDocument();
  });
});
