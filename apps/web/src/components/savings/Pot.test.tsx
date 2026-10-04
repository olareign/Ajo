import { render, screen } from "@testing-library/react";
import { Beads } from "./Beads";
import { Pot } from "./Pot";

describe("the pot", () => {
  it("says how full it is, in words, and never more than full or less than empty", () => {
    const { rerender } = render(<Pot ratio={0.4} />);
    expect(screen.getByRole("img", { name: "Pot, 40% full" })).toBeInTheDocument();
    rerender(<Pot ratio={7} />);
    expect(screen.getByRole("img", { name: "Pot, 100% full" })).toBeInTheDocument();
    rerender(<Pot ratio={-1} />);
    expect(screen.getByRole("img", { name: "Pot, 0% full" })).toBeInTheDocument();
    rerender(<Pot ratio={0.5} label="Rent, half full" />);
    expect(screen.getByRole("img", { name: "Rent, half full" })).toBeInTheDocument();
  });

  it("drops a coin only when asked to", () => {
    const { container, rerender } = render(<Pot ratio={0.5} />);
    expect(container.querySelector(".pot-coin")).toBeNull();
    rerender(<Pot ratio={0.5} dropKey={1} />);
    expect(container.querySelector(".pot-coin")).not.toBeNull();
  });

  it("shows no rippling surface on an empty or a full pot", () => {
    const { container, rerender } = render(<Pot ratio={0} />);
    expect(container.querySelector(".pot-wave")).toBeNull();
    rerender(<Pot ratio={1} />);
    expect(container.querySelector(".pot-wave")).toBeNull();
    rerender(<Pot ratio={0.3} />);
    expect(container.querySelector(".pot-wave")).not.toBeNull();
  });
});

describe("the beads", () => {
  const debits = [
    { seq: 1, dueOn: "2026-11-01", status: "paid" as const },
    { seq: 2, dueOn: "2026-11-08", status: "failed" as const },
    { seq: 3, dueOn: "2026-11-15", status: "scheduled" as const },
    { seq: 4, dueOn: "2026-11-22", status: "scheduled" as const },
    { seq: 5, dueOn: "2026-11-29", status: "skipped" as const },
  ];

  it("names every bead's state in words, so colour is never the only clue", () => {
    render(<Beads debits={debits} />);
    expect(screen.getByRole("listitem", { name: "Debit 1: paid, Sun 1 Nov" })).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Debit 2: missed, Sun 8 Nov" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Debit 5: skipped, Sun 29 Nov" }),
    ).toBeInTheDocument();
  });

  it("rings only the next one still to come", () => {
    render(<Beads debits={debits} />);
    const next = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-next"));
    expect(next).toHaveLength(1);
    expect(next[0]).toHaveAccessibleName("Debit 3: coming, next, Sun 15 Nov");
  });
});
