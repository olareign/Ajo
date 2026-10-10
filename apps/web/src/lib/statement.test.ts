import {
  cell,
  decimal,
  presetRange,
  readStatement,
  statementCsv,
  type Statement,
} from "./statement";

describe("statement helpers", () => {
  it("writes exact decimals from minor units", () => {
    expect(decimal("123450")).toBe("1234.50");
    expect(decimal("5")).toBe("0.05");
    expect(decimal("-1500")).toBe("-15.00");
    expect(decimal("900000000000000000")).toBe("9000000000000000.00");
  });

  it("keeps a spreadsheet from running anything in a cell, and quotes what needs quoting", () => {
    expect(cell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(cell("+1")).toBe("'+1");
    expect(cell("-2")).toBe("'-2");
    expect(cell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(cell("Rent, March")).toBe('"Rent, March"');
    expect(cell("-15.00", true)).toBe("-15.00");
    expect(cell("Plain")).toBe("Plain");
  });

  it("gives preset ranges that end no later than today", () => {
    expect(presetRange("this-month", "2026-10-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(presetRange("last-month", "2026-10-10")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(presetRange("last-month", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
    expect(presetRange("last-3-months", "2026-02-20")).toEqual({
      from: "2025-12-01",
      to: "2026-02-20",
    });
    expect(presetRange("this-year", "2026-10-10")).toEqual({
      from: "2026-01-01",
      to: "2026-10-10",
    });
  });

  it("writes a CSV with a header, one row per line, the person's own time, and money in or out", () => {
    const statement: Statement = {
      from: "2026-09-01",
      to: "2026-09-30",
      timeZone: "Africa/Lagos",
      balances: [],
      truncated: false,
      lines: [
        {
          id: "1",
          at: "2026-09-30T23:30:00Z",
          type: "funding",
          account: "available",
          direction: "in",
          amount: "250000",
          currency: "NGN",
          reference: "ajf_1",
        },
        {
          id: "2",
          at: "2026-09-02T08:00:00Z",
          type: "savings_debit",
          account: "available",
          direction: "out",
          amount: "50000",
          currency: "NGN",
          reference: "=cmd",
        },
      ],
    };
    const csv = statementCsv(statement);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const rows = csv.slice(1).trimEnd().split("\r\n");
    expect(rows[0]).toBe("Date,Time,Description,Account,Money in,Money out,Currency,Reference");
    // 23:30 UTC on 30 Sept is 00:30 on 1 Oct in Lagos.
    expect(rows[1]).toMatch(/^2026-10-01,00:30,[^,]+,Available,2500.00,,NGN,ajf_1$/);
    expect(rows[2]).toMatch(/^2026-09-02,09:00,[^,]+,Available,,500.00,NGN,'=cmd$/);
  });

  it("reads only what looks right from the API, and nothing from an odd answer", () => {
    expect(readStatement(null)).toBeNull();
    expect(readStatement({ lines: "x" })).toBeNull();
    const read = readStatement({
      from: "2026-09-01",
      to: "2026-09-30",
      timeZone: "Africa/Lagos",
      truncated: true,
      balances: [
        { currency: "NGN", opening: "1", closing: "2", moneyIn: "1", moneyOut: "0" },
        { currency: "NGN", opening: "x" },
      ],
      lines: [
        { id: "1", amount: "5", direction: "in" },
        { id: "2", amount: "1e9", direction: "in" },
      ],
    });
    expect(read?.lines).toHaveLength(1);
    expect(read?.balances).toHaveLength(1);
    expect(read?.truncated).toBe(true);
  });
});
