import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { pageNumbers, usePaged } from "@/lib/paging";
import { Pager } from "./Pager";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("usePaged", () => {
  it("shows one page at a time, with where it starts and ends", () => {
    const { result } = renderHook(() => usePaged(range(23)));
    expect(result.current).toMatchObject({ page: 1, pages: 3, from: 1, to: 10, total: 23 });
    act(() => result.current.setPage(3));
    expect(result.current.slice).toEqual([21, 22, 23]);
    expect(result.current).toMatchObject({ from: 21, to: 23 });
  });

  it("keeps the page in range when the list shrinks, and starts again when the size changes", () => {
    const { result, rerender } = renderHook(({ items }) => usePaged(items), {
      initialProps: { items: range(45) },
    });
    act(() => result.current.setPage(5));
    rerender({ items: range(12) });
    expect(result.current.page).toBe(2);
    act(() => result.current.setSize(50));
    expect(result.current).toMatchObject({ page: 1, pages: 1, to: 12 });
  });

  it("has one empty page when there is nothing", () => {
    const { result } = renderHook(() => usePaged([] as number[]));
    expect(result.current).toMatchObject({ page: 1, pages: 1, from: 0, to: 0, total: 0 });
  });
});

describe("pageNumbers", () => {
  it("keeps the first, the last and the neighbours, with gaps between", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageNumbers(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });
});

function List({
  items,
  more,
}: Readonly<{ items: readonly number[]; more?: { has: boolean; load: () => Promise<unknown> } }>) {
  const paged = usePaged(items);
  return (
    <>
      <ul aria-label="Numbers">
        {paged.slice.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <Pager paged={paged} noun={["number", "numbers"]} {...(more ? { more } : {})} />
    </>
  );
}

describe("Pager", () => {
  it("says what is shown, moves between pages, and marks the current one", async () => {
    const user = userEvent.setup();
    render(<List items={range(25)} />);
    expect(screen.getByText("Showing 1–10 of 25 numbers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Showing 21–25 of 25 numbers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Per page"), "50");
    expect(screen.getByText("Showing 1–25 of 25 numbers")).toBeInTheDocument();
  });

  it("fetches the next batch when Next is pressed on the last page loaded", async () => {
    const user = userEvent.setup();
    function Growing() {
      const [items, setItems] = useState(range(10));
      return (
        <List
          items={items}
          more={{
            has: items.length < 20,
            load: async () => setItems(range(20)),
          }}
        />
      );
    }
    render(<Growing />);
    expect(screen.getByText("Showing 1–10 of 10+ numbers")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Showing 11–20 of 20 numbers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("says so when the list is empty", () => {
    render(<List items={[]} />);
    expect(screen.getByText("No numbers")).toBeInTheDocument();
  });
});
