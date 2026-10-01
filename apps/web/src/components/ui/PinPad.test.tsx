import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PinPad } from "./PinPad";

function Harness({
  length = 4,
  onChange = () => {},
}: {
  length?: number;
  onChange?: (v: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <PinPad
      label="Enter your PIN"
      length={length}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("PinPad", () => {
  it("collects digits from its keys", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    expect(onChange).toHaveBeenLastCalledWith("19");
    expect(screen.getByText("2 of 4 digits entered")).toBeInTheDocument();
  });

  it("never shows the digits themselves", async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    expect(container.querySelector("[data-dots]")).not.toHaveTextContent("7");
  });

  it("stops at the PIN length and can delete the last digit", async () => {
    const onChange = vi.fn();
    render(<Harness length={2} onChange={onChange} />);
    for (const d of ["1", "2", "3"]) await userEvent.click(screen.getByRole("button", { name: d }));
    expect(onChange).toHaveBeenLastCalledWith("12");
    await userEvent.click(screen.getByRole("button", { name: "Delete last digit" }));
    expect(onChange).toHaveBeenLastCalledWith("1");
  });

  it("accepts typing on a keyboard too", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole("group", { name: "Enter your PIN" }).focus();
    await userEvent.keyboard("42{Backspace}");
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(["4", "42", "4"]);
  });
});
