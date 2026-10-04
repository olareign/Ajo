import { act, renderHook } from "@testing-library/react";
import { polling, usePayment } from "./use-payment";

const POLL_EVERY_MS = polling.everyMs;
const POLL_LIMIT = polling.limit;

const payment = (status: string) => ({
  id: "p1",
  kind: "funding",
  status,
  method: "card",
  amount: { amount: "1000", currency: "NGN" },
  action: null,
  failureReason: null,
  createdAt: "2026-10-04T10:00:00.000Z",
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tick = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));

describe("following a payment", () => {
  it("keeps asking while it is pending and stops once it is settled", async () => {
    const answers = ["pending", "pending", "succeeded"];
    const fetchMock = vi.fn(async () =>
      Response.json(payment(answers[Math.min(fetchMock.mock.calls.length - 1, 2)]!)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePayment("p1"));

    await tick(0);
    expect(result.current.payment?.status).toBe("pending");
    await tick(POLL_EVERY_MS);
    await tick(POLL_EVERY_MS);
    expect(result.current.payment?.status).toBe("succeeded");
    const calls = fetchMock.mock.calls.length;
    await tick(POLL_EVERY_MS * 5);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("does nothing without an id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderHook(() => usePayment(null));
    await tick(POLL_EVERY_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives up after a while and says so, without calling the payment failed", async () => {
    const fetchMock = vi.fn(async () => Response.json(payment("pending")));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePayment("p1"));
    await tick(POLL_EVERY_MS * (POLL_LIMIT + 5));
    expect(result.current.gaveUp).toBe(true);
    expect(result.current.payment?.status).toBe("pending");
    expect(fetchMock.mock.calls.length).toBe(POLL_LIMIT);
  });

  it("tries again after a dropped connection, but not after the API said no", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(Response.json(payment("succeeded")));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePayment("p1"));
    await tick(0);
    expect(result.current.failure).toBeUndefined();
    await tick(POLL_EVERY_MS);
    expect(result.current.payment?.status).toBe("succeeded");

    const refused = vi.fn(async () =>
      Response.json({ message: "No such payment." }, { status: 404 }),
    );
    vi.stubGlobal("fetch", refused);
    const second = renderHook(() => usePayment("p2"));
    await tick(POLL_EVERY_MS * 3);
    expect(second.result.current.failure).toMatchObject({ kind: "refused", status: 404 });
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it("stops asking when the screen goes away", async () => {
    const fetchMock = vi.fn(async () => Response.json(payment("pending")));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = renderHook(() => usePayment("p1"));
    await tick(0);
    unmount();
    const calls = fetchMock.mock.calls.length;
    await tick(POLL_EVERY_MS * 5);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
