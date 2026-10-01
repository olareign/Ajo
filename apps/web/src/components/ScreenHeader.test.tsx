import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreenHeader } from "./ScreenHeader";

describe("ScreenHeader", () => {
  it("shows the green eyebrow and the question as the page heading", () => {
    render(<ScreenHeader eyebrow="We Move!" title="What are you saving for?" />);
    expect(screen.getByText("We Move!")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "What are you saving for?" }),
    ).toBeInTheDocument();
  });

  it("has a back button when given a handler", async () => {
    const onBack = vi.fn();
    render(<ScreenHeader title="Groups" onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("can link back instead", () => {
    render(<ScreenHeader title="Groups" backHref="/" />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });
});
