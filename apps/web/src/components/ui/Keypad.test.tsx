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

  describe("on a desktop, without clicking it first", () => {
    const real = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
    beforeEach(() => {
      // jsdom draws nothing; treat every element as on screen.
      Object.defineProperty(HTMLElement.prototype, "offsetParent", {
        configurable: true,
        get() {
          return this.parentNode;
        },
      });
    });
    afterEach(() => {
      if (real) Object.defineProperty(HTMLElement.prototype, "offsetParent", real);
    });

    it("takes digits and Backspace typed anywhere on the page", async () => {
      const spy = vi.fn();
      render(<Harness length={6} spy={spy} />);
      await userEvent.keyboard("7886{Backspace}5");
      expect(spy).toHaveBeenLastCalledWith("7885");
    });

    it("leaves text fields and shortcuts alone", async () => {
      const spy = vi.fn();
      render(
        <>
          <input aria-label="Name" />
          <Harness length={6} spy={spy} />
        </>,
      );
      await userEvent.click(screen.getByLabelText("Name"));
      await userEvent.keyboard("12");
      expect(screen.getByLabelText("Name")).toHaveValue("12");
      (document.activeElement as HTMLElement).blur();
      await userEvent.keyboard("{Control>}3{/Control}");
      expect(spy).not.toHaveBeenCalled();
    });

    it("does nothing while it is not on screen", async () => {
      Object.defineProperty(HTMLElement.prototype, "offsetParent", {
        configurable: true,
        get: () => null,
      });
      const spy = vi.fn();
      render(<Harness length={6} spy={spy} />);
      await userEvent.keyboard("5");
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
