import { render, screen } from "@testing-library/react";
import { Splash } from "./Splash";

describe("Splash", () => {
  it("shows the brand as the page heading", () => {
    render(<Splash />);
    expect(screen.getByRole("heading", { level: 1, name: "Àjọ" })).toBeInTheDocument();
  });

  it("gives the logo an accessible name and a tagline", () => {
    render(<Splash />);
    expect(screen.getByRole("img", { name: "Àjọ logo" })).toBeInTheDocument();
    expect(screen.getByText("Save together, with people you trust.")).toBeInTheDocument();
  });
});
