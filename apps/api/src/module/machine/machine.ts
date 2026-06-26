import type { Paged } from "@molca/network";

type Machine = {
  id: number;
  code: string;
  name: string;
  lineId: number;
  line: {
    id: number;
    name: string;
  } | null;
  isMain: boolean;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type SubMachine = {
  id: number;
  code: string;
  name: string;
  machineId: number;
  machine: {
    id: number;
    name: string;
  } | null;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

type MachineList = Omit<Machine, "updatedAt" | "line">;
type SubMachineList = Omit<SubMachine, "updatedAt" | "machine">;

type MachineFilter = {
  q?: string;
  lineId?: number;
  isMain?: boolean;
};

type SubMachineFilter = {
  q?: string;
  machineId?: number;
};

type ListMachineInput = {
  limit: number;
  offset: number;
  filter: MachineFilter;
};

type ListSubMachineInput = {
  limit: number;
  offset: number;
  filter: SubMachineFilter;
};

type PagedMachine = Paged<MachineList>;
type PagedSubMachine = Paged<SubMachineList>;

type CreateMachine = {
  code: string;
  name: string;
  lineId: number;
  isMain: boolean;
};

type CreateSubMachine = {
  code: string;
  name: string;
  machineId: number;
};

type UpdateMachine = Partial<CreateMachine>;

type UpdateSubMachine = Partial<CreateSubMachine>;

export type {
  Machine,
  SubMachine,
  MachineFilter,
  SubMachineFilter,
  MachineList,
  SubMachineList,
  ListMachineInput,
  ListSubMachineInput,
  PagedMachine,
  PagedSubMachine,
  CreateMachine,
  CreateSubMachine,
  UpdateMachine,
  UpdateSubMachine,
};
