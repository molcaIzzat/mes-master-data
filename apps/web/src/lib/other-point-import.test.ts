import { describe, it, expect } from "vite-plus/test";

import {
  OtherPointFileError,
  otherPointTemplateCsv,
  parseOtherPointFile,
} from "./other-point-import.js";

// A File the parser can read, without a browser: only `.text()` and `.name`
// are touched on the CSV path.
function csvFile(content: string, name = "points.csv"): File {
  return { name, text: () => Promise.resolve(content) } as unknown as File;
}

const HEADER = "Equipment Code,Role,Data Type,Source Tag";

describe("parseOtherPointFile", () => {
  it("maps the columns onto the request body", async () => {
    const rows = await parseOtherPointFile(
      csvFile(`${HEADER}\nEQ-1,downtime,boolean,PLC/FI2-L1/MITSUM-1/Machine_Stop`),
    );

    expect(rows).toEqual([
      {
        equipmentCode: "EQ-1",
        role: "downtime",
        dataType: "boolean",
        sourceTag: "PLC/FI2-L1/MITSUM-1/Machine_Stop",
      },
    ]);
  });

  it("reads the columns in whatever order and case the file has them", async () => {
    const rows = await parseOtherPointFile(
      csvFile(`source tag, DATA TYPE ,Role,Equipment Code\nTAG-1,uint16,reject,EQ-9`),
    );

    expect(rows[0]).toEqual({
      equipmentCode: "EQ-9",
      role: "reject",
      dataType: "uint16",
      sourceTag: "TAG-1",
    });
  });

  it("names the columns that are missing", async () => {
    const err = await parseOtherPointFile(
      csvFile("Equipment Code,Role,Type,Source Tag\nEQ-1,downtime,boolean,TAG"),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(OtherPointFileError);
    expect((err as Error).message).toContain('"Data Type"');
    expect((err as Error).message).toContain("Type");
  });

  it("does not accept a count point file in its place", async () => {
    const err = await parseOtherPointFile(
      csvFile("Equipment Code,Unit Code,Role,Source,Source Tag\nEQ-1,PCS,reject,plc,TAG"),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(OtherPointFileError);
    expect((err as Error).message).toContain('"Data Type"');
  });

  it("rejects a file with a header but no rows", async () => {
    const err = await parseOtherPointFile(csvFile(HEADER)).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(OtherPointFileError);
    expect((err as Error).message).toContain("no rows");
  });

  it("refuses a file type it cannot read, and says what to do about .xls", async () => {
    const err = await parseOtherPointFile(csvFile("anything", "points.xls")).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(OtherPointFileError);
    expect((err as Error).message).toContain(".xlsx");
  });

  it("parses its own template", async () => {
    const rows = await parseOtherPointFile(csvFile(otherPointTemplateCsv()));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "downtime", dataType: "boolean" });
    expect(rows[1]).toMatchObject({ role: "reject", dataType: "uint16" });
  });
});
