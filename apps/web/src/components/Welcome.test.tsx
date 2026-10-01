import { render, screen } from "@testing-library/react";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("names the product and its promise", () => {
    render(<Welcome />);
    expect(screen.getByRole("heading", { level: 1, name: "Àjọ" })).toBeInTheDocument();
    expect(screen.getByText("Save together, with people you trust.")).toBeInTheDocument();
  });

  it("shows the circle, since that is what Àjọ is", () => {
    render(<Welcome />);
    expect(screen.getByRole("img", { name: /receives this round/ })).toBeInTheDocument();
  });

  it("offers creating an account first, then signing in", () => {
    render(<Welcome />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Create account", "/sign-up"],
      ["Sign in", "/sign-in"],
    ]);
  });

  it("does not promise interest", () => {
    render(<Welcome />);
    expect(screen.queryByText(/interest|earn|returns/i)).not.toBeInTheDocument();
  });

  it("shows the Àjọ logo (the piggy bank is its o), as the page's heading", () => {
    const { container } = render(<Welcome />);
    expect(screen.getByRole("heading", { level: 1, name: "Àjọ" })).toBeInTheDocument();
    expect(container.querySelector('img[src="/brand/ajo-wordmark.webp"]')).toBeInTheDocument();
  });

  it("brings everything in with a short entrance: the circle rolls, the coin drops", () => {
    const { container } = render(<Welcome />);
    expect(container.querySelector("figure[data-roll]")).toBeInTheDocument();
    expect(container.querySelector("[data-animated] .logo-coin")).toBeInTheDocument();
    expect(container.querySelectorAll(".motion-rise").length).toBeGreaterThanOrEqual(2);
  });

  it("shows people's photos in the circle when there are any", () => {
    const { container } = render(<Welcome photos={["/people/01.jpg", "/people/02.jpg"]} />);
    expect([...container.querySelectorAll("image")].map((i) => i.getAttribute("href"))).toEqual([
      "/people/01.jpg",
      "/people/02.jpg",
    ]);
  });

  it("falls back to initials when there are no photos", () => {
    const { container } = render(<Welcome photos={[]} />);
    expect(container.querySelectorAll("image")).toHaveLength(0);
    expect(container.querySelector("[data-bead]")?.textContent).toBe("AO");
  });
});
