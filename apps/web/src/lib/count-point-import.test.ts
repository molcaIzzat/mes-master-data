import { describe, it, expect } from "vite-plus/test";

import {
  CountPointFileError,
  countPointTemplateCsv,
  parseCountPointFile,
} from "./count-point-import.js";

// A File the parser can read, without a browser: only `.text()` and `.name`
// are touched on the CSV path.
function csvFile(content: string, name = "points.csv"): File {
  return { name, text: () => Promise.resolve(content) } as unknown as File;
}

const HEADER = "Equipment Code,Unit Code,Role,Source,Source Tag";

describe("parseCountPointFile", () => {
  it("maps the columns onto the request body", async () => {
    const rows = await parseCountPointFile(
      csvFile(`${HEADER}\nEQ-1,PCS,good_output,plc,PLC/WC-01/Total`),
    );

    expect(rows).toEqual([
      {
        equipmentCode: "EQ-1",
        unitCode: "PCS",
        role: "good_output",
        source: "plc",
        sourceTag: "PLC/WC-01/Total",
      },
    ]);
  });

  it("reads the columns in whatever order and case the file has them", async () => {
    const rows = await parseCountPointFile(
      csvFile(`source tag,ROLE,Unit Code, Source ,Equipment Code\nTAG-1,reject,KG,manual,EQ-9`),
    );

    expect(rows[0]).toEqual({
      equipmentCode: "EQ-9",
      unitCode: "KG",
      role: "reject",
      source: "manual",
      sourceTag: "TAG-1",
    });
  });

  it("names the columns that are missing", async () => {
    const err = await parseCountPointFile(
      csvFile("Equipment Code,Uom Code,Role,Source,Source Tag\nEQ-1,PCS,reject,plc,TAG"),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CountPointFileError);
    expect((err as Error).message).toContain('"Unit Code"');
    expect((err as Error).message).toContain("Uom Code");
  });

  it("rejects a file with a header but no rows", async () => {
    const err = await parseCountPointFile(csvFile(HEADER)).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CountPointFileError);
    expect((err as Error).message).toContain("no rows");
  });

  it("refuses a file type it cannot read, and says what to do about .xls", async () => {
    const err = await parseCountPointFile(csvFile("anything", "points.xls")).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(CountPointFileError);
    expect((err as Error).message).toContain(".xlsx");
  });

  it("parses its own template", async () => {
    const rows = await parseCountPointFile(csvFile(countPointTemplateCsv()));

    expect(rows).toHaveLength(1);
    expect(rows[0].equipmentCode).toBe("EQ-FILLER-01");
    expect(rows[0].role).toBe("good_output");
  });
});
