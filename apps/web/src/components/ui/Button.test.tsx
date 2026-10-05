import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

describe("Button while its action is under way", () => {
  function Shared() {
    const [busy, setBusy] = useState(false);
    return (
      <>
        <Button loading={busy} onClick={() => setBusy(true)}>
          Save
        </Button>
        <Button loading={busy}>Cancel</Button>
        <Button onClick={() => setBusy(false)}>Done</Button>
      </>
    );
  }

  it("turns only on the button that was pressed, and none can be pressed again", async () => {
    const user = userEvent.setup();
    render(<Shared />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    const save = screen.getByRole("button", { name: "Save" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(save.querySelector("[data-spinner]")).not.toBeNull();
    expect(save).toBeDisabled();
    expect(cancel).toBeDisabled();
    expect(cancel).not.toHaveAttribute("aria-busy");
    expect(cancel.querySelector("[data-spinner]")).toBeNull();
  });

  it("stops turning when the work ends", async () => {
    const user = userEvent.setup();
    render(<Shared />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    expect(save).not.toHaveAttribute("aria-busy");
    expect(save.querySelector("[data-spinner]")).toBeNull();
  });

  it("does not stay primed when a press started nothing", async () => {
    function Later() {
      const [busy, setBusy] = useState(false);
      return (
        <>
          <Button loading={busy} onClick={() => undefined}>
            Check
          </Button>
          <Button loading={busy} onClick={() => setBusy(true)}>
            Send
          </Button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Later />);
    await user.click(screen.getByRole("button", { name: "Check" }));
    await new Promise((r) => setTimeout(r, 5));
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("button", { name: "Check" })).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("aria-busy", "true");
  });
});
