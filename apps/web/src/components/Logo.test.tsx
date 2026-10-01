import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("is one image named Àjọ for screen readers; the three layers are decoration", () => {
    const { container } = render(<Logo />);
    expect(screen.getByRole("img", { name: "Àjọ" })).toBeInTheDocument();
    const layers = [...container.querySelectorAll("img")];
    expect(layers).toHaveLength(3);
    for (const layer of layers) expect(layer).toHaveAttribute("alt", "");
  });

  it("stacks the sparkles and coin under the wordmark, so the coin can drop in behind the pig", () => {
    const { container } = render(<Logo />);
    const order = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(order).toEqual([
      "/brand/ajo-rays.webp",
      "/brand/ajo-coin.webp",
      "/brand/ajo-wordmark.webp",
    ]);
  });

  it("keeps the logo's own proportions, so nothing jumps when the images load", () => {
    const { container } = render(<Logo />);
    expect(container.firstElementChild).toHaveStyle({ aspectRatio: "916 / 562" });
  });

  it("animates only when asked to, so it can also be used still", () => {
    const still = render(<Logo />);
    expect(still.container.querySelector("[data-animated]")).toBeNull();
    const moving = render(<Logo animated />);
    expect(moving.container.querySelector("[data-animated]")).toBeInTheDocument();
    expect(moving.container.querySelector(".logo-coin")).toBeInTheDocument();
    expect(moving.container.querySelector(".logo-rays")).toBeInTheDocument();
  });

  it("sets the size from the caller", () => {
    const { container } = render(<Logo width={300} />);
    expect(container.firstElementChild).toHaveStyle({ width: "300px" });
  });
});
