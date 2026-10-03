import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Me } from "./MeGate";
import { Onboarding } from "./Onboarding";

const replace = vi.fn();
// Like Next's own router: one object for the life of the page.
const router = { replace, push: replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

const photos = Array.from({ length: 8 }, (_, i) => `/people/0${i + 1}.jpg`);
const fresh: Me = {
  displayName: "Ada Ola",
  email: "ada@example.com",
  onboarded: false,
  country: null,
  goal: null,
  username: null,
  hasPin: false,
};
const show = (me: Partial<Me> = {}) =>
  render(<Onboarding me={{ ...fresh, ...me }} photos={photos} />);

type Route = (init: RequestInit | undefined) => Response | Promise<Response>;
/** Answers each path from `routes`; anything not listed succeeds quietly. */
function api(routes: Record<string, Route> = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.split("?")[0]!;
    if (routes[path]) return routes[path](init);
    if (path === "/api/me/username/available") return Response.json({ available: true });
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const saves = (fetchMock: ReturnType<typeof api>) =>
  (fetchMock.mock.calls as unknown as [string, RequestInit?][])
    .filter(([, init]) => init?.method === "PUT")
    .map(([url, init]) => [url, JSON.parse(init!.body as string)]);

const click = (name: string | RegExp, role = "button") =>
  userEvent.click(screen.getByRole(role, { name }));
async function enter(digits: string) {
  for (const d of digits) await click(d);
}
const skipStory = () => click("Skip");
async function chooseCountryAndGoal() {
  await click(/Nigeria/, "radio");
  await click("Continue");
  await click(/Both/, "radio");
  await click("Continue");
}
async function chooseHandle(name = "ada_ola") {
  await userEvent.type(screen.getByLabelText("Username"), name);
  await screen.findByText(`@${name} is yours to take.`, undefined, { timeout: 3000 });
  await click("Continue");
}

describe("Onboarding: a new person", () => {
  it("is shown how Àjọ works first, and can skip it", async () => {
    api();
    show();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/save on your own/i);
    await skipStory();
    expect(screen.getByRole("heading", { name: /where do you live/i })).toBeInTheDocument();
  });

  it("goes on from the last scene straight into the questions", async () => {
    api();
    show();
    await click("Next");
    await click("Next");
    await click("Let's set you up");
    expect(screen.getByRole("heading", { name: /where do you live/i })).toBeInTheDocument();
  });

  it("asks for the country first and will not move on without one", async () => {
    api();
    show();
    await skipStory();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await click(/United Kingdom/, "radio");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("walks country, goal, handle, PIN and confirmation, saving each answer as it goes, then lands on Today", async () => {
    const fetchMock = api();
    show();
    await skipStory();
    await chooseCountryAndGoal();
    expect(saves(fetchMock)).toEqual([["/api/me/profile", { country: "NG", goal: "both" }]]);

    expect(screen.getByRole("heading", { name: /pick your handle/i })).toBeInTheDocument();
    await chooseHandle();
    expect(saves(fetchMock).at(-1)).toEqual(["/api/me/username", { username: "ada_ola" }]);

    expect(screen.getByRole("heading", { name: /choose a pin/i })).toBeInTheDocument();
    await enter("493817");
    await click("Continue");
    expect(screen.getByRole("heading", { name: /confirm your pin/i })).toBeInTheDocument();
    await enter("493817");
    await click("Finish");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
    expect(saves(fetchMock).map(([url]) => url)).toEqual([
      "/api/me/profile",
      "/api/me/username",
      "/api/me/pin",
    ]);
    expect(saves(fetchMock).at(-1)).toEqual(["/api/me/pin", { pin: "493817" }]);
  });

  it("counts only the questions in 'Step n of m', not the scenes", async () => {
    api();
    show();
    await skipStory();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("lets the back button return to the previous question, but not into the scenes", async () => {
    api();
    show();
    await skipStory();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await click(/Nigeria/, "radio");
    await click("Continue");
    await click("Back");
    expect(screen.getByRole("heading", { name: /where do you live/i })).toBeInTheDocument();
  });
});

describe("Onboarding: choosing a handle", () => {
  async function toHandle() {
    show();
    await skipStory();
    await chooseCountryAndGoal();
  }

  it("keeps Continue off until the name is free", async () => {
    api();
    await toHandle();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Username"), "ab");
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 3 characters.");
    expect(next).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Username"), "c");
    expect(next).toBeDisabled();
    await screen.findByText("@abc is yours to take.", undefined, { timeout: 3000 });
    expect(next).toBeEnabled();
  });

  it("says when a name is taken and offers ideas instead", async () => {
    api({ "/api/me/username/available": () => Response.json({ available: false }) });
    await toHandle();
    await userEvent.type(screen.getByLabelText("Username"), "ada");
    expect(
      await screen.findByText("@ada is taken. Try one of these:", undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "@ada_ola" })).toBeInTheDocument();
  });

  it("lets the person carry on when the live check cannot run, since saving will say for certain", async () => {
    api({ "/api/me/username/available": () => Response.json({}, { status: 502 }) });
    await toHandle();
    await userEvent.type(screen.getByLabelText("Username"), "ada_ola");
    await screen.findByText(/couldn't check just now/i, undefined, { timeout: 3000 });
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("stays on the handle, with the reason, if someone took the name a moment ago", async () => {
    api({
      "/api/me/username": () =>
        Response.json({ message: "That username isn't available." }, { status: 409 }),
    });
    await toHandle();
    await userEvent.type(screen.getByLabelText("Username"), "ada_ola");
    await screen.findByText("@ada_ola is yours to take.", undefined, { timeout: 3000 });
    await click("Continue");

    expect(await screen.findByText("@ada_ola is taken. Try one of these:")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pick your handle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});

describe("Onboarding: the PIN", () => {
  async function toPin() {
    show();
    await skipStory();
    await chooseCountryAndGoal();
    await chooseHandle();
  }

  it("sends the person back to choose again when the two PINs differ, saving no PIN", async () => {
    const fetchMock = api();
    await toPin();
    await enter("493817");
    await click("Continue");
    await enter("493818");
    await click("Finish");
    expect(await screen.findByText(/didn't match/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /choose a pin/i })).toBeInTheDocument();
    expect(saves(fetchMock).map(([url]) => url)).not.toContain("/api/me/pin");
  });

  it("shows the API's reason when the PIN is too easy to guess", async () => {
    api({
      "/api/me/pin": () =>
        Response.json({ message: "Choose a PIN that isn't a repeat." }, { status: 400 }),
    });
    await toPin();
    await enter("123456");
    await click("Continue");
    await enter("123456");
    await click("Finish");
    expect(await screen.findByText(/isn't a repeat/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("treats 'you already have a PIN' as done, since an earlier try may have got that far", async () => {
    api({
      "/api/me/pin": () => Response.json({ message: "You already have a PIN." }, { status: 409 }),
    });
    await toPin();
    await enter("493817");
    await click("Continue");
    await enter("493817");
    await click("Finish");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
  });
});

describe("Onboarding: a person who stopped part-way", () => {
  it("is asked only for the username if that is all that is missing", async () => {
    const fetchMock = api();
    show({ country: "NG", goal: "solo", hasPin: true });

    expect(screen.queryByRole("heading", { level: 1, name: /save on your own/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /pick your handle/i })).toBeInTheDocument();
    expect(screen.getByText("One last thing")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Username"), "ada_ola");
    await screen.findByText("@ada_ola is yours to take.", undefined, { timeout: 3000 });
    await click("Finish");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
    expect(saves(fetchMock)).toEqual([["/api/me/username", { username: "ada_ola" }]]);
  });

  it("picks up at the PIN when country, goal and username are done", async () => {
    show({ country: "GB", goal: "circle", username: "ada_ola" });
    expect(screen.getByRole("heading", { name: /choose a pin/i })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });

  it("picks up at the goal when only the country was saved, without replaying the scenes", async () => {
    show({ country: "NG" });
    expect(screen.getByRole("heading", { name: /what brings you/i })).toBeInTheDocument();
  });

  it("goes to Today at once if there is nothing left to ask", async () => {
    show({ country: "NG", goal: "solo", username: "ada_ola", hasPin: true });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/today"));
  });

  it("sends a signed-out person to sign in when saving is refused", async () => {
    api({ "/api/me/profile": () => Response.json({}, { status: 401 }) });
    show();
    await skipStory();
    await chooseCountryAndGoal();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
