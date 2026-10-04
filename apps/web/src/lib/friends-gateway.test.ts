import { previewFriends } from "./friends-gateway";

describe("the pretend server for friends", () => {
  it("starts with two friends, one waiting request, and people you may know ranked by what you share", async () => {
    const gw = previewFriends();
    const friends = await gw.friends();
    expect(friends.ok && friends.data.map((f) => f.username)).toEqual(["chidi_o", "funmi_a"]);
    const requests = await gw.requests();
    expect(requests.ok && requests.data.incoming.map((r) => r.username)).toEqual(["tunde_b"]);
    const suggestions = await gw.suggestions();
    expect(suggestions.ok && suggestions.data.map((s) => [s.username, s.mutualFriends])).toEqual([
      ["ngozi_e", 2],
      ["kemi_s", 1],
    ]);
  });

  it("searches by the start of a username, the exact one first, and never shows blocked people", async () => {
    const gw = previewFriends();
    const found = await gw.search("@SAD");
    expect(found.ok && found.data.map((p) => p.username)).toEqual(["sade_k"]);
    await gw.block("sade_k");
    expect((await gw.search("sad")).ok && (await gw.search("sad"))).toMatchObject({ data: [] });
    expect(await gw.person("sade_k")).toMatchObject({ ok: false });
  });

  it("asks, cancels, accepts and removes the way the server does", async () => {
    const gw = previewFriends();
    expect(await gw.request("sade_k")).toEqual({ ok: true, data: { relation: "requested" } });
    const out = await gw.requests();
    expect(out.ok && out.data.outgoing.map((r) => r.username)).toEqual(["sade_k"]);
    await gw.cancel("sade_k");
    expect((await gw.person("sade_k")).ok && (await gw.person("sade_k"))).toMatchObject({
      data: { relation: "none" },
    });
    // Asking someone who asked you is accepting.
    expect(await gw.request("tunde_b")).toEqual({ ok: true, data: { relation: "friend" } });
    await gw.remove("tunde_b");
    expect((await gw.friends()).ok && (await gw.friends())).toMatchObject({
      data: expect.not.arrayContaining([expect.objectContaining({ username: "tunde_b" })]),
    });
    expect(await gw.accept("emeka_o")).toMatchObject({ ok: false });
  });

  it("blocks away a friendship, lists the blocked, and brings them back as strangers on unblock", async () => {
    const gw = previewFriends();
    await gw.block("chidi_o");
    expect((await gw.friends()).ok && (await gw.friends())).toMatchObject({
      data: [expect.objectContaining({ username: "funmi_a" })],
    });
    expect((await gw.blocks()).ok && (await gw.blocks())).toMatchObject({
      data: [expect.objectContaining({ username: "chidi_o" })],
    });
    expect(await gw.request("chidi_o")).toMatchObject({
      ok: false,
      failure: { code: "person_not_found" },
    });
    await gw.unblock("chidi_o");
    const back = await gw.person("chidi_o");
    expect(back.ok && back.data.relation).toBe("none");
  });

  it("gives a sample invite and takes a report", async () => {
    const gw = previewFriends();
    expect(await gw.invite()).toMatchObject({ ok: true, data: { code: "PREVIEW1" } });
    expect(await gw.report("sade_k", "spam")).toEqual({ ok: true, data: {} });
    expect(await gw.report("nobody", "spam")).toMatchObject({ ok: false });
  });

  it("keeps each tab's preview to itself", async () => {
    const a = previewFriends();
    const b = previewFriends();
    await a.block("chidi_o");
    expect((await b.friends()).ok && (await b.friends())).toMatchObject({
      data: [expect.anything(), expect.anything()],
    });
  });
});
