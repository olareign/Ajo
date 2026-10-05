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

  it("says what the screen is for, under the heading", () => {
    render(<ScreenHeader title="Hi there" subtitle="Welcome back. Sign in to your account." />);
    expect(screen.getByText("Welcome back. Sign in to your account.")).toBeInTheDocument();
  });

  it("puts inner screens in an app bar pinned to the top: back on the left, a short title centred", () => {
    render(<ScreenHeader title="Add money" backHref="/wallet" action={<button>Help</button>} />);
    const bar = screen.getByRole("link", { name: "Back" }).parentElement!;
    expect(bar).toHaveAttribute("data-app-bar");
    expect(bar.className).toContain("sticky");
    expect(bar).toContainElement(screen.getByRole("heading", { level: 1, name: "Add money" }));
    expect(bar).toContainElement(screen.getByRole("button", { name: "Help" }));
  });

  it("keeps a long, question-like title large under the bar instead of cutting it", () => {
    render(<ScreenHeader title="How much would you like to save?" onBack={() => undefined} />);
    const bar = screen.getByRole("button", { name: "Back" }).parentElement!;
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("How much would you like to save?");
    expect(bar).not.toContainElement(heading);
  });

  it("gives tab screens a large title and no back arrow", () => {
    render(<ScreenHeader title="Savings" />);
    expect(screen.queryByRole("link", { name: "Back" })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Savings" }).closest("[data-app-bar]"),
    ).toBeNull();
  });

  it("takes a soft edge once the page scrolls", async () => {
    render(<ScreenHeader title="Wallet" backHref="/today" />);
    const bar = screen.getByRole("link", { name: "Back" }).parentElement!;
    expect(bar).not.toHaveAttribute("data-scrolled");
    Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(bar).toHaveAttribute("data-scrolled"));
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });
});
