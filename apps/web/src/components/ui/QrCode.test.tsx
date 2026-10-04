import { render, screen } from "@testing-library/react";
import { QrCode } from "./QrCode";

describe("QrCode", () => {
  it("draws the code as one named image, with dark modules as a single path", () => {
    render(<QrCode value="otpauth://totp/Ajo:ada?secret=ABCD" label="Scan to add Àjọ" />);
    const image = screen.getByRole("img", { name: "Scan to add Àjọ" });
    expect(image.tagName.toLowerCase()).toBe("svg");
    expect(image.querySelectorAll("path")).toHaveLength(1);
    expect(image.querySelector("path")!.getAttribute("d")!.length).toBeGreaterThan(200);
  });

  it("is a pure function of its value", () => {
    const { container, rerender } = render(<QrCode value="one" label="code" />);
    const first = container.querySelector("path")!.getAttribute("d");
    rerender(<QrCode value="one" label="code" />);
    expect(container.querySelector("path")!.getAttribute("d")).toBe(first);
    rerender(<QrCode value="two" label="code" />);
    expect(container.querySelector("path")!.getAttribute("d")).not.toBe(first);
  });

  it("keeps a quiet border so phone cameras can find the corners", () => {
    const { container } = render(<QrCode value="otpauth://x" label="code" />);
    const box = container.querySelector("svg")!.getAttribute("viewBox")!.split(" ").map(Number);
    const path = container.querySelector("path")!.getAttribute("d")!;
    const xs = [...path.matchAll(/M(\d+) /g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...xs)).toBeLessThan(box[2]! - 2);
  });
});
