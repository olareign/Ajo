import { applyTheme, readTheme, THEME_KEY, THEME_SCRIPT } from "./theme";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("the theme choice", () => {
  it("follows the device until a choice is made", () => {
    expect(readTheme()).toBe("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("sets and remembers light or dark, and going back to system forgets it", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(readTheme()).toBe("dark");
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("ignores anything stored that is not a theme", () => {
    localStorage.setItem(THEME_KEY, "purple");
    expect(readTheme()).toBe("system");
  });

  // jsdom does not run inline <script>s, so the fixed string the layout inlines is run directly.
  // eslint-disable-next-line no-new-func -- runs the app's own constant, never outside input
  const runHeadScript = new Function(THEME_SCRIPT) as () => void;

  it("applies a stored choice before the page draws, and ignores junk", () => {
    localStorage.setItem(THEME_KEY, "light");
    runHeadScript();
    expect(document.documentElement.dataset.theme).toBe("light");
    delete document.documentElement.dataset.theme;
    localStorage.setItem(THEME_KEY, "<script>");
    runHeadScript();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("still applies a choice when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    spy.mockRestore();
  });
});
