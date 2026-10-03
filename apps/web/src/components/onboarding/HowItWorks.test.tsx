import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HowItWorks } from "./HowItWorks";

const photos = Array.from({ length: 8 }, (_, i) => `/people/0${i + 1}.jpg`);

/** The device's "reduce motion" setting, as the page sees it. */
function deviceReducesMotion(reduces: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduces && query.includes("reduce"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}
beforeEach(() => deviceReducesMotion(false));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const next = () => userEvent.click(screen.getByRole("button", { name: "Next" }));

describe("HowItWorks", () => {
  it("starts with saving on your own, in plain words, with nothing to go back to", () => {
    render(<HowItWorks photos={photos} onFinish={() => undefined} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/save on your own/i);
    expect(screen.getByText(/deposits happen by themselves/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByRole("group", { name: "1 of 3" })).toBeInTheDocument();
  });

  it("goes on to how a circle works, then to why it is safe, and back again", async () => {
    render(<HowItWorks photos={photos} onFinish={() => undefined} />);
    await next();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/take turns/i);
    expect(screen.getByText(/the whole pot goes to one person/i)).toBeInTheDocument();
    await next();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/everyone is checked/i);
    expect(screen.getByText(/pot always arrives in full/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/take turns/i);
  });

  it("finishes from the last scene with a button that says what comes next", async () => {
    const onFinish = vi.fn();
    render(<HowItWorks photos={photos} onFinish={onFinish} />);
    await next();
    await next();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Let's set you up" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("can be skipped from any scene", async () => {
    const onFinish = vi.fn();
    render(<HowItWorks photos={photos} onFinish={onFinish} />);
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  describe("swiping", () => {
    const swipe = (from: [number, number], to: [number, number]) => {
      const area = screen.getByTestId("swipe-area");
      fireEvent.touchStart(area, { touches: [{ clientX: from[0], clientY: from[1] }] });
      fireEvent.touchEnd(area, { changedTouches: [{ clientX: to[0], clientY: to[1] }] });
    };

    it("moves on with a swipe left, and back with a swipe right", () => {
      render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      swipe([260, 300], [120, 305]);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/take turns/i);
      swipe([120, 300], [260, 300]);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/save on your own/i);
    });

    it("ignores a tap, a small wobble and a scroll down the page", () => {
      render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      swipe([200, 300], [190, 300]);
      swipe([260, 200], [150, 520]);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/save on your own/i);
    });

    it("does not swipe past either end", () => {
      render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      swipe([120, 300], [260, 300]);
      expect(screen.getByRole("group", { name: "1 of 3" })).toBeInTheDocument();
    });
  });

  describe("the scenes", () => {
    it("are pictures for the eye: hidden from screen readers, which get the words instead", () => {
      const { container } = render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      expect(container.querySelector("[data-scene]")).toHaveAttribute("aria-hidden", "true");
    });

    it("fill a savings goal stitch by stitch, with a coin landing each time", () => {
      vi.useFakeTimers();
      const { container } = render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      const bar = () => within(container).getByRole("progressbar", { hidden: true });
      const before = Number(bar().getAttribute("aria-valuenow"));
      act(() => {
        vi.advanceTimersByTime(1100 * 3);
      });
      expect(Number(bar().getAttribute("aria-valuenow"))).toBe(before + 3);
      expect(container.querySelector(".scene-coin")).toBeInTheDocument();
    });

    it("pass the pot round the circle of photos, one recipient at a time", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { container } = render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      await userEvent
        .setup({ advanceTimers: vi.advanceTimersByTime })
        .click(screen.getByRole("button", { name: "Next" }));
      const recipient = () =>
        [...container.querySelectorAll("[data-bead]")].findIndex(
          (bead) => bead.getAttribute("data-bead") === "recipient",
        );
      expect([...container.querySelectorAll("image")].map((i) => i.getAttribute("href"))).toEqual(
        photos,
      );
      const first = recipient();
      act(() => {
        vi.advanceTimersByTime(1400);
      });
      expect(recipient()).toBe((first + 1) % 8);
      act(() => {
        vi.advanceTimersByTime(1400 * 7);
      });
      expect(recipient()).toBe(first);
    });

    it("show three reasons to trust the circle", async () => {
      render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      await next();
      await next();
      for (const reason of [/identity-checked/i, /deposit covers a miss/i, /trust grows/i]) {
        expect(screen.getByText(reason)).toBeInTheDocument();
      }
    });

    it("hold still for someone who has asked their device to reduce motion", async () => {
      deviceReducesMotion(true);
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { container } = render(<HowItWorks photos={photos} onFinish={() => undefined} />);
      const bar = () => within(container).getByRole("progressbar", { hidden: true });
      const resting = bar().getAttribute("aria-valuenow");
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(bar().getAttribute("aria-valuenow")).toBe(resting);

      await userEvent
        .setup({ advanceTimers: vi.advanceTimersByTime })
        .click(screen.getByRole("button", { name: "Next" }));
      const recipient = () =>
        [...container.querySelectorAll("[data-bead]")].findIndex(
          (bead) => bead.getAttribute("data-bead") === "recipient",
        );
      const still = recipient();
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(recipient()).toBe(still);
    });
  });
});
