import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start a circle</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Start a circle" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("cannot be clicked while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("has a gold money variant for actions that move money, plus quiet and danger", () => {
    render(
      <>
        <Button variant="money">Pay ₦10,000</Button>
        <Button variant="quiet">Invite</Button>
        <Button variant="danger">Leave circle</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Pay ₦10,000" })).toHaveAttribute(
      "data-variant",
      "money",
    );
    expect(screen.getByRole("button", { name: "Invite" })).toHaveAttribute("data-variant", "quiet");
    expect(screen.getByRole("button", { name: "Leave circle" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("comes in a large, full-width size for bottom-of-screen actions", () => {
    render(
      <Button size="lg" block>
        Create account
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-size", "lg");
    expect(button.className).toMatch(/w-full/);
  });
});
