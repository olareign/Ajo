import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoScreen } from "./PhotoScreen";

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/crop-canvas", () => ({
  cropToJpeg: vi.fn(
    async () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1])], { type: "image/jpeg" }),
  ),
}));
import { cropToJpeg } from "@/lib/crop-canvas";

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  replace.mockReset();
});

const profile = (over: object = {}) => ({
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: true,
  username: "ada_ola",
  photosEnabled: true,
  photoVersion: null,
  ...over,
});
type Route = (init?: RequestInit) => Response;
function api(routes: Record<string, Route> = {}, me: object = profile()) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/me") return Response.json(me);
    const route = routes[`${init?.method ?? "GET"} ${url}`];
    return route ? route(init) : new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
const jpeg = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 1])], "me.jpg", { type: "image/jpeg" });

async function pick(file: File) {
  const input = (await screen.findByLabelText(
    "Choose a picture from your phone",
  )) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  const preview = (await waitFor(() => {
    const el = document.querySelector("img[src='blob:preview']");
    expect(el).not.toBeNull();
    return el;
  })) as HTMLImageElement;
  Object.defineProperty(preview, "naturalWidth", { value: 1600 });
  Object.defineProperty(preview, "naturalHeight", { value: 900 });
  fireEvent.load(preview);
  return preview;
}

describe("the profile picture screen", () => {
  it("says so plainly while picture storage is not switched on", async () => {
    api({}, profile({ photosEnabled: false }));
    render(<PhotoScreen />);
    expect(await screen.findByText(/aren.t switched on yet/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Choose a picture from your phone")).toBeNull();
  });

  it("offers to choose a picture, or change and remove the one there", async () => {
    api();
    const first = render(<PhotoScreen />);
    expect(await screen.findByRole("button", { name: "Choose a picture" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove picture" })).toBeNull();
    first.unmount();
    api({}, profile({ photoVersion: 5 }));
    render(<PhotoScreen />);
    expect(await screen.findByRole("button", { name: "Change picture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove picture" })).toBeInTheDocument();
  });

  it("frames the chosen picture, then sends only the cropped JPEG and goes back to Me", async () => {
    const mock = api({ "PUT /api/me/photo": () => Response.json({ version: 9 }) });
    const user = userEvent.setup();
    render(<PhotoScreen />);
    await pick(jpeg());
    const use = screen.getByRole("button", { name: "Use this picture" });
    expect(use).toBeEnabled();
    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "2" } });
    await user.click(use);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/me"));
    expect(cropToJpeg).toHaveBeenCalledWith(
      expect.anything(),
      280,
      expect.objectContaining({ zoom: 2 }),
    );
    const put = mock.mock.calls.find(([, init]) => init?.method === "PUT")!;
    expect(put[0]).toBe("/api/me/photo");
    expect((put[1]!.headers as Record<string, string>)["Content-Type"]).toBe("image/jpeg");
    expect(put[1]!.body).toBeInstanceOf(Blob);
  });

  it("can be moved with the arrow keys and zoomed with the buttons, and cannot be pulled off the edge", async () => {
    api();
    const user = userEvent.setup();
    render(<PhotoScreen />);
    const preview = await pick(jpeg());
    const frame = screen.getByRole("application");
    frame.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    // 1600x900 at zoom 1 can slide sideways only; 24px right of centre is allowed, not up or down.
    expect(preview.style.transform).toBe("translate(24px, 0px)");
    await user.keyboard("{ArrowUp}");
    expect(preview.style.transform).toBe("translate(24px, 0px)");
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("1.25");
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("1");
  });

  it("refuses other kinds of file before anything is sent, and shows the server's words when it refuses", async () => {
    const mock = api({
      "PUT /api/me/photo": () =>
        Response.json(
          { message: "That picture is larger than 5 MB.", code: "photo_too_large" },
          { status: 413 },
        ),
    });
    const user = userEvent.setup();
    render(<PhotoScreen />);
    const input = (await screen.findByLabelText(
      "Choose a picture from your phone",
    )) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG or WebP picture.",
    );
    expect(mock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
    await pick(jpeg());
    await user.click(screen.getByRole("button", { name: "Use this picture" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("larger than 5 MB");
    expect(push).not.toHaveBeenCalled();
  });

  it("removes the picture and goes back to Me", async () => {
    const mock = api(
      { "DELETE /api/me/photo": () => new Response(null, { status: 204 }) },
      profile({ photoVersion: 5 }),
    );
    const user = userEvent.setup();
    render(<PhotoScreen />);
    await user.click(await screen.findByRole("button", { name: "Remove picture" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/me"));
    expect(
      mock.mock.calls.some(([u, init]) => u === "/api/me/photo" && init?.method === "DELETE"),
    ).toBe(true);
  });
});
