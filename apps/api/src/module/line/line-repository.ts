import type { CreateLine, Line, ListLineInput, PagedLine, UpdateLine } from "./line.js";
import type { PostgresDB } from "../../shared/database/postgres.js";
import type { LineSummary } from "@molca/contract-client";

type LineReaderDeps = {
  db: PostgresDB;
  region: string;
};

type LineWriterDeps = {
  db: PostgresDB;
  region: string;
};

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
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: LineReaderDeps) {
    this.db = db;
    this.region = region;
  }

  async findAll(_: ListLineInput): Promise<PagedLine> {
    return { items: [], totalElements: 0 };
  }

  async findById(_: number): Promise<Line | undefined> {
    return undefined;
  }

  async existById(_: number): Promise<boolean> {
    return false;
  }

  async findSummariesByIds(_: number[]): Promise<LineSummary[]> {
    return [];
  }
}

class LineWriterRepository implements LineWriter {
  private region: string;
  private db: PostgresDB;

  constructor({ db, region }: LineWriterDeps) {
    this.db = db;
    this.region = region;
  }

  async create(_: CreateLine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }

  async update(_: number, _patch: UpdateLine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }

  async delete(_: number): Promise<void> {
    throw new Error("THIS FEATURE IS UNAVAILABLE");
  }
}

export { LineReaderRepository, LineWriterRepository };
export type { LineReaderDeps, LineWriterDeps, LineReader, LineWriter };
