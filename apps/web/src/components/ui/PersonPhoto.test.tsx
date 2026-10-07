import { fireEvent, render } from "@testing-library/react";
import { PersonPhoto } from "./PersonPhoto";

describe("PersonPhoto", () => {
  it("loads the private picture through our own route, versioned so a new picture shows at once", () => {
    const { container } = render(<PersonPhoto username="ada_ola" version={123} name="Ada Ola" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/api/photo/ada_ola?v=123");
    expect(img).toHaveAttribute("alt", "");
  });

  it("shows the stand-in when there is no picture", () => {
    const none = render(<PersonPhoto username="ada_ola" version={null} name="Ada Ola" />);
    expect(none.container.querySelector("img")).toBeNull();
    expect(none.container.querySelector("svg")).not.toBeNull();
    const initials = render(
      <PersonPhoto username={null} version={5} name="Ada Ola" standIn="initials" />,
    );
    expect(initials.container.textContent).toBe("AO");
  });

  it("falls back when the picture cannot be loaded", () => {
    const { container } = render(
      <PersonPhoto username="ada_ola" version={1} name="Ada Ola" standIn="initials" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("AO");
  });

  it("builds its address safely from the username", () => {
    const { container } = render(<PersonPhoto username="a b/../c" version={1} name="X" />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(
      "/api/photo/a%20b%2F..%2Fc?v=1",
    );
  });
});
