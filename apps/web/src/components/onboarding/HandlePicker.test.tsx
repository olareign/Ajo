import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HandlePicker } from "./HandlePicker";
import type { UsernameCheck } from "./useUsernameCheck";

const photos = Array.from({ length: 8 }, (_, i) => `/people/0${i + 1}.jpg`);
const setup = (value: string, check: UsernameCheck, onChange = vi.fn()) => {
  const view = render(
    <HandlePicker
      displayName="Ada Ola"
      photos={photos}
      value={value}
      onChange={onChange}
      check={check}
    />,
  );
  return { ...view, onChange };
};

describe("HandlePicker", () => {
  it("puts the person in the circle: seven photos and an empty seat that is theirs", () => {
    const { container } = setup("", { phase: "idle" });
    const beads = container.querySelectorAll("[data-bead]");
    expect(beads).toHaveLength(8);
    expect(container.querySelectorAll("[data-you]")).toHaveLength(1);
    expect(container.querySelector("[data-you]")!.querySelector("image")).toBeNull();
    expect(container.querySelectorAll("image")).toHaveLength(7);
  });

  it("shows the handle in the heart of the circle as it is typed, and a placeholder before", () => {
    const { rerender } = setup("", { phase: "idle" });
    expect(screen.getByTestId("handle-heart")).toHaveTextContent("@yourname");
    rerender(
      <HandlePicker
        displayName="Ada Ola"
        photos={photos}
        value="Ada_Ola"
        onChange={() => {}}
        check={{ phase: "checking" }}
      />,
    );
    expect(screen.getByTestId("handle-heart")).toHaveTextContent("@ada_ola");
  });

  it("shrinks a long handle step by step, so even twenty characters stay in the circle", () => {
    const size = (value: string) => {
      const { unmount } = setup(value, { phase: "checking" });
      const cls = screen.getByTestId("handle-heart").querySelectorAll("span")[1]!.className;
      unmount();
      return cls;
    };
    const sizes = [
      "ada",
      "ada_ola99",
      "ada_ola_savers",
      "ada_ola_savers_circ",
      "ada_ola_savers_circle",
    ].map(size);
    expect(sizes[0]).toContain("text-[22px]");
    expect(sizes[4]).toContain("text-[10px]");
    expect(new Set(sizes).size).toBeGreaterThanOrEqual(4);
  });

  it("hands what is typed to the parent, with the @ as decoration only", async () => {
    const { onChange } = setup("", { phase: "idle" });
    const field = screen.getByLabelText("Username");
    expect(screen.getByText("@", { selector: "span[aria-hidden]" })).toBeInTheDocument();
    await userEvent.type(field, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("explains a name that will not do, on the field itself", () => {
    setup("ab", { phase: "invalid", message: "Use at least 3 characters." });
    expect(screen.getByLabelText("Username")).toHaveAccessibleDescription(
      "Use at least 3 characters.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 3 characters.");
  });

  it("says plainly that it is checking, and when the name is free", () => {
    const { rerender } = setup("ada_ola", { phase: "checking" });
    expect(screen.getByRole("status")).toHaveTextContent("Checking…");
    rerender(
      <HandlePicker
        displayName="Ada Ola"
        photos={photos}
        value="ada_ola"
        onChange={() => {}}
        check={{ phase: "available" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("@ada_ola is yours to take.");
  });

  it("offers ideas from the person's own name before anything is typed, and fills one in on a tap", async () => {
    const { onChange } = setup("", { phase: "idle" });
    const ideas = screen.getByRole("group", { name: "Ideas" });
    expect(within(ideas).getByRole("button", { name: "@ada" })).toBeInTheDocument();
    expect(within(ideas).getByRole("button", { name: "@ada_ola" })).toBeInTheDocument();
    await userEvent.click(within(ideas).getByRole("button", { name: "@ada_ola" }));
    expect(onChange).toHaveBeenCalledWith("ada_ola");
  });

  it("says when a name is taken and puts the ideas back, without offering the taken one", () => {
    setup("ada", { phase: "taken" });
    expect(screen.getByRole("status")).toHaveTextContent("@ada is taken.");
    const ideas = screen.getByRole("group", { name: "Ideas" });
    expect(within(ideas).queryByRole("button", { name: "@ada" })).toBeNull();
    expect(within(ideas).getByRole("button", { name: "@ada_ola" })).toBeInTheDocument();
  });

  it("does not crowd a name that is free or being checked with ideas", () => {
    setup("ada_ola", { phase: "available" });
    expect(screen.queryByRole("group", { name: "Ideas" })).toBeNull();
  });

  it("says it could not check, and that the person can carry on", () => {
    setup("ada_ola", { phase: "error" });
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't check just now/i);
  });
});
