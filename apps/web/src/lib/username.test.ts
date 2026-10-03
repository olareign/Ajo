import { normalizeUsername, suggestUsernames, USERNAME_PATTERN, usernameProblem } from "./username";

describe("normalizeUsername", () => {
  it("trims, lowercases and drops a leading @, as the API stores it", () => {
    expect(normalizeUsername("  @Ada_Ola ")).toBe("ada_ola");
  });
});

describe("usernameProblem", () => {
  it("says nothing about an empty box, and nothing about a good name", () => {
    expect(usernameProblem("")).toBeNull();
    expect(usernameProblem("   ")).toBeNull();
    expect(usernameProblem("ada_ola")).toBeNull();
    expect(usernameProblem("@Ada99")).toBeNull();
  });

  it.each([
    ["ab", "Use at least 3 characters."],
    ["x".repeat(21), "Keep it to 20 characters or fewer."],
    ["1ada", "Start with a letter."],
    ["_ada", "Start with a letter."],
    ["ada ola", "Use only letters, numbers and underscores."],
    ["ada.ola", "Use only letters, numbers and underscores."],
    ["adé", "Use only letters, numbers and underscores."],
  ])("explains %s in plain words", (name, words) => {
    expect(usernameProblem(name)).toBe(words);
  });

  it("agrees exactly with the pattern the API enforces", () => {
    for (const name of ["ada", "a_b", "abc123", "ab", "9abc", "ABC", "a-b", "x".repeat(20)]) {
      const fine = USERNAME_PATTERN.test(normalizeUsername(name));
      expect(usernameProblem(name) === null).toBe(fine);
    }
  });
});

describe("suggestUsernames", () => {
  it("builds a few valid, different ideas from the person's name", () => {
    const ideas = suggestUsernames("Ada Ola");
    expect(ideas.length).toBeGreaterThanOrEqual(3);
    expect(ideas.length).toBeLessThanOrEqual(4);
    expect(new Set(ideas).size).toBe(ideas.length);
    for (const idea of ideas) expect(USERNAME_PATTERN.test(idea)).toBe(true);
    expect(ideas).toContain("ada");
    expect(ideas).toContain("ada_ola");
  });

  it("folds accents and dots under letters, so Yoruba names become typeable", () => {
    const ideas = suggestUsernames("Adébáyọ̀ Ola");
    expect(ideas).toContain("adebayo");
    for (const idea of ideas) expect(USERNAME_PATTERN.test(idea)).toBe(true);
  });

  it("copes with one name, symbols and names that cannot be turned into letters", () => {
    expect(suggestUsernames("Funmi")).toEqual(expect.arrayContaining(["funmi", "funmi_ajo"]));
    expect(suggestUsernames("O'Brien-Smith Jr.").every((i) => USERNAME_PATTERN.test(i))).toBe(true);
    expect(suggestUsernames("张伟")).toEqual([]);
    expect(suggestUsernames("")).toEqual([]);
  });

  it("never offers more than twenty characters or fewer than three", () => {
    for (const name of ["Al", "Bo Li", "Bartholomew Montgomery-Featherstonehaugh"]) {
      for (const idea of suggestUsernames(name)) expect(USERNAME_PATTERN.test(idea)).toBe(true);
    }
  });
});
