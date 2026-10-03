import { act, renderHook } from "@testing-library/react";
import { DEBOUNCE_MS, useUsernameCheck } from "./useUsernameCheck";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const answer = (body: object, status = 200) => Promise.resolve(Response.json(body, { status }));
const stubFetch = (impl: (url: string) => Promise<Response>) => {
  const fetchMock = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
const settle = async (ms = DEBOUNCE_MS) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("useUsernameCheck", () => {
  it("has nothing to say about an empty box", () => {
    const fetchMock = stubFetch(() => answer({ available: true }));
    const { result } = renderHook(() => useUsernameCheck(""));
    expect(result.current).toEqual({ phase: "idle" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a name that cannot work, without asking the server", async () => {
    const fetchMock = stubFetch(() => answer({ available: true }));
    const { result } = renderHook(() => useUsernameCheck("no spaces"));
    await settle(2000);
    expect(result.current).toEqual({
      phase: "invalid",
      message: "Use only letters, numbers and underscores.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("waits for a pause in typing, then asks once for the tidied-up name", async () => {
    const fetchMock = stubFetch(() => answer({ available: true }));
    const { result, rerender } = renderHook(({ v }) => useUsernameCheck(v), {
      initialProps: { v: "ada" },
    });
    expect(result.current.phase).toBe("checking");
    await settle(DEBOUNCE_MS - 100);
    rerender({ v: "@Ada_O" });
    await settle(DEBOUNCE_MS - 100);
    expect(fetchMock).not.toHaveBeenCalled();

    await settle(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/me/username/available?username=ada_o");
    expect(result.current).toEqual({ phase: "available" });
  });

  it("reports a name that is taken", async () => {
    stubFetch(() => answer({ available: false }));
    const { result } = renderHook(() => useUsernameCheck("ada"));
    await settle();
    expect(result.current).toEqual({ phase: "taken" });
  });

  it.each([
    ["a server error", () => answer({ message: "down" }, 502)],
    ["no connection", () => Promise.reject(new Error("offline"))],
    ["an answer it cannot read", () => answer({ available: "maybe" })],
  ])("says it could not check, on %s", async (_why, respond) => {
    stubFetch(respond as () => Promise<Response>);
    const { result } = renderHook(() => useUsernameCheck("ada"));
    await settle();
    expect(result.current).toEqual({ phase: "error" });
  });

  it("never lets a slow answer about an earlier name overwrite the current one", async () => {
    let releaseFirst!: (r: Response) => void;
    const fetchMock = stubFetch((url) =>
      url.endsWith("=ada")
        ? new Promise<Response>((resolve) => (releaseFirst = resolve))
        : answer({ available: true }),
    );
    const { result, rerender } = renderHook(({ v }) => useUsernameCheck(v), {
      initialProps: { v: "ada" },
    });
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ v: "adaola" });
    await settle();
    expect(result.current).toEqual({ phase: "available" });

    await act(async () => releaseFirst(Response.json({ available: false })));
    expect(result.current).toEqual({ phase: "available" });
  });

  it("treats a name the server already refused at save time as taken, whatever the live check said", async () => {
    stubFetch(() => answer({ available: true }));
    const { result } = renderHook(() => useUsernameCheck("ada", ["ada"]));
    await settle();
    expect(result.current).toEqual({ phase: "taken" });
  });
});
