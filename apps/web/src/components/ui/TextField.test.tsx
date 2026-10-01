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

  describe("password fields", () => {
    it("start hidden, with an eye button to show the password", () => {
      render(
        <TextField label="Password" type="password" value="secret phrase" onChange={() => {}} />,
      );
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
      expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("show and hide the password when the eye is pressed, keeping what was typed", async () => {
      render(
        <TextField label="Password" type="password" value="secret phrase" onChange={() => {}} />,
      );
      const input = screen.getByLabelText("Password");

      await userEvent.click(screen.getByRole("button", { name: "Show password" }));
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveValue("secret phrase");
      expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveValue("secret phrase");
    });

    it("never submits the form when the eye is pressed", async () => {
      const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <TextField label="Password" type="password" value="x" onChange={() => {}} />
        </form>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Show password" }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("turns off autocapitalise and spellcheck while the password is visible", async () => {
      render(<TextField label="Password" type="password" value="x" onChange={() => {}} />);
      await userEvent.click(screen.getByRole("button", { name: "Show password" }));
      const input = screen.getByLabelText("Password");
      expect(input).toHaveAttribute("autocapitalize", "none");
      expect(input).toHaveAttribute("spellcheck", "false");
    });

    it("sit beside the eye without the text running under it", () => {
      render(<TextField label="Password" type="password" value="" onChange={() => {}} />);
      expect(screen.getByLabelText("Password").className).toContain("pr-14");
    });
  });

  it("gives other kinds of field no eye button", () => {
    render(<TextField label="Email" type="email" value="" onChange={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is a soft filled field that takes an outline only when focused", () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    const cls = screen.getByLabelText("Email").className;
    expect(cls).toContain("bg-surface-sunken");
    expect(cls).toContain("border-transparent");
    expect(cls).toContain("focus:border-adire");
  });
});
