import { render, screen } from "@testing-library/react";
import { Stamp } from "./Stamp";

describe("Stamp", () => {
  it("is named by what it stands for and how it stands, so it reads without seeing it", () => {
    render(<Stamp label="ID" title="Your ID" status="approved" />);
    expect(screen.getByRole("img", { name: "Your ID: approved" })).toBeInTheDocument();
  });

  it.each([
    ["not_started", "Your ID: not stamped yet"],
    ["pending", "Your ID: being checked"],
    ["approved", "Your ID: approved"],
    ["rejected", "Your ID: needs another try"],
  ] as const)("says %s in words", (status, name) => {
    render(<Stamp label="ID" title="Your ID" status={status} />);
    expect(screen.getByRole("img", { name })).toHaveAttribute("data-status", status);
  });

  it("only animates a stamp that has just landed", () => {
    const { rerender } = render(<Stamp label="ID" title="Your ID" status="approved" />);
    expect(screen.getByRole("img")).not.toHaveClass("stamp-thunk");
    rerender(<Stamp label="ID" title="Your ID" status="approved" fresh />);
    expect(screen.getByRole("img")).toHaveClass("stamp-thunk");
  });

  it("gives every stamp its own text path, so two on a page do not borrow each other's", () => {
    const { container } = render(
      <>
        <Stamp label="ID" title="Your ID" status="approved" />
        <Stamp label="FACE" title="Your face" status="approved" />
      </>,
    );
    const ids = [...container.querySelectorAll("path[id]")].map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
  });
});
