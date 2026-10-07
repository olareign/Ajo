import { render, screen } from "@testing-library/react";
import { AppNav } from "./AppNav";

let path = "/today";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

describe("AppNav", () => {
  it.each(["/today", "/save", "/circles", "/wallet", "/me", "/friends", "/notifications"])(
    "shows on %s, the top of a section",
    (top) => {
      path = top;
      render(<AppNav />);
      expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    },
  );

  it.each(["/wallet/add", "/me/phone", "/save/new", "/circles/new", "/help"])(
    "stays out of the way inside %s",
    (deep) => {
      path = deep;
      render(<AppNav />);
      expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
    },
  );
});
