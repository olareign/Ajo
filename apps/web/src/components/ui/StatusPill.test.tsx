import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it.each([
    ["paid", "Paid"],
    ["pending", "Pending"],
    ["late", "Late"],
    ["covered", "Covered"],
    ["yourTurn", "Your turn"],
  ] as const)("shows %s as a word and an icon, never colour alone", (status, word) => {
    const { container } = render(<StatusPill status={status} />);
    expect(screen.getByText(word)).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.firstChild).toHaveAttribute("data-status", status);
  });
});
