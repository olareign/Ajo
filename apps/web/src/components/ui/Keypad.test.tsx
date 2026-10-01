import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Keypad } from "./Keypad";

function Harness({ length = 3, spy = () => {} }: { length?: number; spy?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Keypad
      label="Digits"
      length={length}
      value={value}
      onChange={(v) => {
        setValue(v);
        spy(v);
      }}
    />
  );
}

describe("Keypad", () => {
  it("adds digits and deletes the last one", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "4" }));
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete last digit" }));
    expect(spy).toHaveBeenLastCalledWith("4");
  });

  it("stops at the code length", async () => {
    const spy = vi.fn();
    render(<Harness length={2} spy={spy} />);
    for (const d of ["1", "2", "3"]) await userEvent.click(screen.getByRole("button", { name: d }));
    expect(spy).toHaveBeenLastCalledWith("12");
  });

  it("takes digits from a physical keyboard", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    screen.getByRole("group", { name: "Digits" }).focus();
    await userEvent.keyboard("90");
    expect(spy).toHaveBeenLastCalledWith("90");
  });

  it("has touch targets of 56px, so the pad and a button above it fit on a small phone", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "5" }).className).toContain("h-14");
  });
});
