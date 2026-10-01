import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("is labelled so screen readers and tests can find it", async () => {
    const onChange = vi.fn();
    render(<TextField label="Plan Name" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Plan Name"), "A");

    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("shows a hint inside the field, like 'Max 12'", () => {
    render(<TextField label="No of People" value="8" onChange={() => {}} hint="Max 12" />);
    expect(screen.getByLabelText("No of People")).toHaveAccessibleDescription("Max 12");
  });

  it("announces an error and marks the field invalid", () => {
    render(
      <TextField label="Amount" value="abc" onChange={() => {}} error="Enter a valid amount" />,
    );
    const input = screen.getByLabelText("Amount");
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Enter a valid amount");
  });
});
