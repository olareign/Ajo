import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Proceed</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Proceed" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("cannot be clicked while disabled (the pale Proceed state in the designs)", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Proceed
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Proceed" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Proceed" })).toBeDisabled();
  });

  it("is a normal button by default, so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("has an outline variant for secondary actions such as Chat Room and Cancel", () => {
    render(<Button variant="outline">Chat Room</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline");
  });
});
