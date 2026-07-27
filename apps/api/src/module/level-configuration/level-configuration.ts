import type { Paged } from "@molca/network";

// Every node in the tree renders as id + code + name, so they share one shape.
type LevelNode = {
  id: number;
  code: string;
  name: string;
};

// `class` and `productSignalTag` are not rendered by the table, but the level
// configuration edit forms prefill from the list row, so they travel with it
// rather than costing a per-row fetch when a dialog opens.
type LevelEquipment = LevelNode & {
  class: LevelNode | null;
  productSignalTag: string;
};

type LevelWorkUnit = LevelNode & {
  class: LevelNode | null;
  equipments: LevelEquipment[];
};

// A "Line" row: a work center plus its area, its class (shown as Category in the
// UI) and the work unit / equipment subtree beneath it.
type LevelLine = LevelNode & {
  area: LevelNode | null;
  class: LevelNode | null;
  workUnits: LevelWorkUnit[];
};

type LevelConfigurationFilter = {
  q?: string;
  areaId?: number;
};

type ListLevelConfigurationInput = {
  limit: number;
  offset: number;
  filter: LevelConfigurationFilter;
};

type PagedLevelConfiguration = Paged<LevelLine>;

export type {
  LevelNode,
  LevelEquipment,
  LevelWorkUnit,
  LevelLine,
  LevelConfigurationFilter,
  ListLevelConfigurationInput,
  PagedLevelConfiguration,
};
