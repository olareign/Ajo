import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ChoiceChips } from "./ChoiceChips";

const options = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function Harness({ onChange = () => {} }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <ChoiceChips
      label="How often?"
      options={options}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("ChoiceChips", () => {
  it("is a labelled radio group", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "How often?" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("selects one option at a time", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "Weekly" }));
    await userEvent.click(screen.getByRole("radio", { name: "Daily" }));

    expect(onChange).toHaveBeenLastCalledWith("daily");
    expect(screen.getByRole("radio", { name: "Daily" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Weekly" })).not.toBeChecked();
  });

  it("supports the keyboard: arrow keys move the selection", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("radio", { name: "Daily" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Weekly" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Weekly" })).toHaveFocus();
  });
});
