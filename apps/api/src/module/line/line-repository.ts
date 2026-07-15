import type { CreateLine, Line, ListLineInput, PagedLine, UpdateLine } from "./line.js";
import type { LineSummary } from "@molca/contract-client";

type LineReader = {
  findAll: (input: ListLineInput) => Promise<PagedLine>;
  findById: (id: number) => Promise<Line | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<LineSummary[]>;
};

type LineWriter = {
  create: (line: CreateLine) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateLine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
};

class LineReaderRepository implements LineReader {
  async findAll(_deps: ListLineInput): Promise<PagedLine> {
    return { items: [], totalElements: 0 };
  }

  async findById(_id: number): Promise<Line | undefined> {
    return undefined;
  }

  async existById(_id: number): Promise<boolean> {
    return false;
  }

  async findSummariesByIds(_ids: number[]): Promise<LineSummary[]> {
    return [];
  }
}

class LineWriterRepository implements LineWriter {
  async create(_line: CreateLine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }

  async update(_id: number, _patch: UpdateLine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }

  async delete(_id: number): Promise<void> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }
}

export { LineReaderRepository, LineWriterRepository };
export type { LineReader, LineWriter };
