import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Onboarding } from "./Onboarding";

describe("Onboarding", () => {
  it("introduces solo savings first", () => {
    render(<Onboarding />);
    expect(
      screen.getByRole("heading", { name: "Save money to achieve your goals" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Slide 1 of 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("moves to group savings when the next dot is chosen", async () => {
    render(<Onboarding />);
    await userEvent.click(screen.getByRole("tab", { name: "Slide 2 of 2" }));
    expect(
      screen.getByRole("heading", { name: "Save money in groups with family and friends." }),
    ).toBeInTheDocument();
  });

  it("Next advances, and the last slide offers Get Started", async () => {
    render(<Onboarding />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("tab", { name: "Slide 2 of 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/savings/new",
    );
  });

  it("can be skipped", () => {
    render(<Onboarding />);
    expect(screen.getByRole("link", { name: "Skip" })).toHaveAttribute("href", "/groups");
  });
});
