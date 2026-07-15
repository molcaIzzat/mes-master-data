import type {
  CreateLineWithMachines,
  LineHierarcyInput,
  PagedLineHierarcy,
  CreateMachines,
  CreateSubMachines,
} from "./hierarcy.js";

type HierarcyReader = {
  findLineHierarcy: (input: LineHierarcyInput) => Promise<PagedLineHierarcy>;
};

type HierarcyWriter = {
  createLine: (input: CreateLineWithMachines) => Promise<void>;
  createMachines: (lineId: number, machines: CreateMachines) => Promise<void>;
  createSubMachines: (machineId: number, machines: CreateSubMachines) => Promise<void>;
};

class HierarcyReaderRepository implements HierarcyReader {
  async findLineHierarcy(_deps: LineHierarcyInput): Promise<PagedLineHierarcy> {
    return { items: [], totalElements: 0 };
  }
}

class HierarcyWriterRepository implements HierarcyWriter {
  async createLine(_input: CreateLineWithMachines): Promise<void> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async createMachines(_lineId: number, _input: CreateMachines): Promise<void> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }

  async createSubMachines(_machineId: number, _input: CreateSubMachines): Promise<void> {
    throw new Error("THIS FEATURE IS NOT AVAILABLE");
  }
}

export { HierarcyReaderRepository, HierarcyWriterRepository };
export type { HierarcyReader, HierarcyWriter };
