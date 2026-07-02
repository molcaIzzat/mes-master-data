import type { Paged } from "@molca/network";
import type { LineCategory } from "../line/line.js";

type LineHierarcy = {
  lineId: number;
  lineName: string;
  lineCode: string;
  lineCategory: string;
  area: {
    areaId: number;
    areaName: string;
    areaDisplayName: string | null;
  } | null;
  machines: {
    machineId: number;
    machineCode: string;
    machineName: string;
    mainMachine: boolean;
    machines: {
      machineId: number;
      machineCode: string;
      machineName: string;
    }[];
  }[];
};

type LineHierarcyFilter = {
  q?: string;
  areaId?: number;
};

type LineHierarcyInput = {
  limit: number;
  offset: number;
  filter: LineHierarcyFilter;
};

type CreateMachines = {
  code: string;
  name: string;
  isMain: boolean;
}[];

type CreateSubMachines = {
  code: string;
  name: string;
}[];

type CreateLineWithMachines = {
  code: string;
  name: string;
  areaId: number;
  category: LineCategory;
  machines: CreateMachines;
};

type PagedLineHierarcy = Paged<LineHierarcy>;

export type {
  LineHierarcy,
  LineHierarcyFilter,
  LineHierarcyInput,
  PagedLineHierarcy,
  CreateLineWithMachines,
  CreateMachines,
  CreateSubMachines,
};
