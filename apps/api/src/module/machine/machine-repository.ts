import type {
  CreateMachine,
  CreateSubMachine,
  ListMachineInput,
  ListSubMachineInput,
  Machine,
  PagedMachine,
  PagedSubMachine,
  SubMachine,
  UpdateMachine,
  UpdateSubMachine,
} from "./machine.js";
import type { MachineSummary } from "@molca/contract-client";

type MachineReader = {
  findAll: (input: ListMachineInput) => Promise<PagedMachine>;
  findAllSub: (input: ListSubMachineInput) => Promise<PagedSubMachine>;
  findById: (id: number) => Promise<Machine | undefined>;
  findSubById: (id: number) => Promise<SubMachine | undefined>;
  existById: (id: number) => Promise<boolean>;
  findSummariesByIds: (ids: number[]) => Promise<MachineSummary[]>;
};

type MachineWriter = {
  create: (machine: CreateMachine) => Promise<{ id: number }>;
  createSub: (subMachine: CreateSubMachine) => Promise<{ id: number }>;
  update: (id: number, patch: UpdateMachine) => Promise<{ id: number }>;
  updateSub: (id: number, patch: UpdateSubMachine) => Promise<{ id: number }>;
  delete: (id: number) => Promise<void>;
  deleteSub: (id: number) => Promise<void>;
};

class MachineReaderRepository implements MachineReader {
  async findAll(_deps: ListMachineInput): Promise<PagedMachine> {
    return { items: [], totalElements: 0 };
  }

  async findById(_id: number): Promise<Machine | undefined> {
    return undefined;
  }

  async findAllSub(_deps: ListSubMachineInput): Promise<PagedSubMachine> {
    return { items: [], totalElements: 0 };
  }

  async findSubById(_id: number): Promise<SubMachine | undefined> {
    return undefined;
  }

  async existById(_id: number): Promise<boolean> {
    return false;
  }

  async findSummariesByIds(_ids: number[]): Promise<MachineSummary[]> {
    return [];
  }
}

class MachineWriterRepository implements MachineWriter {
  async create(_machine: CreateMachine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async createSub(_subMachine: CreateSubMachine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async update(_id: number, _patch: UpdateMachine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async updateSub(_id: number, _patch: UpdateSubMachine): Promise<{ id: number }> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async delete(_id: number): Promise<void> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async deleteSub(_id: number): Promise<void> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }
}

export { MachineReaderRepository, MachineWriterRepository };
export type { MachineReader, MachineWriter };
