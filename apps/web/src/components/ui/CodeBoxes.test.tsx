import { render, screen } from "@testing-library/react";
import { CodeBoxes } from "./CodeBoxes";

describe("CodeBoxes", () => {
  it("shows one box per digit, with the digits typed so far (a one-time code is not a secret to hide)", () => {
    const { container } = render(<CodeBoxes label="Authenticator code" value="03" length={6} />);
    const boxes = [...container.querySelectorAll("[data-box]")];
    expect(boxes).toHaveLength(6);
    expect(boxes.map((b) => b.textContent)).toEqual(["0", "3", "", "", "", ""]);
  });

  it("marks the box being filled", () => {
    const { container } = render(<CodeBoxes label="Code" value="03" length={5} />);
    const active = [...container.querySelectorAll("[data-box]")].findIndex((b) =>
      b.hasAttribute("data-active"),
    );
    expect(active).toBe(2);
  });

  it("has no active box once the code is complete", () => {
    const { container } = render(<CodeBoxes label="Code" value="12345" length={5} />);
    expect(container.querySelector("[data-active]")).toBeNull();
  });

  it("tells screen readers how far along it is, once, instead of reading every box", () => {
    render(<CodeBoxes label="Authenticator code" value="03" length={6} />);
    expect(screen.getByRole("group", { name: "Authenticator code" })).toBeInTheDocument();
    expect(screen.getByText("2 of 6 digits entered")).toBeInTheDocument();
  });

  it("shows an error under the boxes and marks them invalid", () => {
    render(<CodeBoxes label="Code" value="" length={6} error="That code is incorrect." />);
    expect(screen.getByRole("alert")).toHaveTextContent("That code is incorrect.");
  });
});
