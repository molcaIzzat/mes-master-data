import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";

import { useAreas, useLevelConfigurations } from "@/lib/queries.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { PAGE_SIZES, TablePagination } from "@/components/table/table-pagination.js";
import { LevelTreeTable } from "@/components/level-configuration/level-tree-table.js";
import { LineFormDialog } from "@/components/level-configuration/line-form-dialog.js";
import { MachineFormDialog } from "@/components/level-configuration/machine-form-dialog.js";
import { EquipmentFormDialog } from "@/components/level-configuration/equipment-form-dialog.js";
import { DeleteNodeDialog } from "@/components/level-configuration/delete-node-dialog.js";

import type { ExpandedState } from "@tanstack/react-table";
import type { LevelTreeActions } from "@/components/level-configuration/level-tree-table.js";
import type { MachineTarget } from "@/components/level-configuration/machine-form-dialog.js";
import type { EquipmentTarget } from "@/components/level-configuration/equipment-form-dialog.js";
import type { DeleteNodeTarget } from "@/components/level-configuration/delete-node-dialog.js";
import type { LevelConfigurationListItem } from "@/lib/types.js";

const ALL_AREAS = "all";
const EMPTY: LevelConfigurationListItem[] = [];

function LevelConfiguration() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState<number | undefined>(undefined);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Each dialog has its own open flag; the target carries the row being edited
  // (null when adding) plus the parent it hangs off.
  const [lineOpen, setLineOpen] = useState(false);
  const [lineItem, setLineItem] = useState<LevelConfigurationListItem | null>(null);
  const [machineOpen, setMachineOpen] = useState(false);
  const [machineTarget, setMachineTarget] = useState<MachineTarget | null>(null);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentTarget, setEquipmentTarget] = useState<EquipmentTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteNodeTarget | null>(null);

  // Debounce the search box before it hits the query; reset to page 1 on change.
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Expansion is keyed by row id, so carrying it into a new result set would
  // leave stale keys behind. Collapse whenever the rows change.
  useEffect(() => {
    setExpanded({});
  }, [page, size, q, areaId]);

  const { data: areas } = useAreas();
  const { data, isPending, isError } = useLevelConfigurations({ page, size, q, areaId });

  const items = data?.items ?? EMPTY;
  const meta = data?.meta;

  const openAddLine = useCallback(() => {
    setLineItem(null);
    setLineOpen(true);
  }, []);

  // Memoised so the table's column definitions stay stable between renders.
  const actions = useMemo<LevelTreeActions>(
    () => ({
      onEditLine: (line) => {
        setLineItem(line);
        setLineOpen(true);
      },
      onAddMachine: (line) => {
        setMachineTarget({ line: { id: line.id, name: line.name }, item: null });
        setMachineOpen(true);
      },
      onEditMachine: (line, unit) => {
        setMachineTarget({ line: { id: line.id, name: line.name }, item: unit });
        setMachineOpen(true);
      },
      onAddEquipment: (unit) => {
        setEquipmentTarget({ unit: { id: unit.id, name: unit.name }, item: null });
        setEquipmentOpen(true);
      },
      onEditEquipment: (unit, equipment) => {
        setEquipmentTarget({ unit: { id: unit.id, name: unit.name }, item: equipment });
        setEquipmentOpen(true);
      },
      onConfigureMachine: (unit) => {
        void navigate({
          to: "/level-configuration/machine/$id",
          params: { id: String(unit.id) },
        });
      },
      onDelete: setDeleteTarget,
    }),
    [navigate],
  );

  function handleAreaChange(value: string) {
    setAreaId(value === ALL_AREAS ? undefined : Number(value));
    setPage(1);
  }

  function handleSizeChange(value: number) {
    setSize(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={areaId ? String(areaId) : ALL_AREAS} onValueChange={handleAreaChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AREAS}>All Area</SelectItem>
              {areas?.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
          </div>
        </div>

        <Button className="w-full sm:w-auto" onClick={openAddLine}>
          <Plus />
          Add Line
        </Button>
      </div>

      <LevelTreeTable
        items={items}
        page={page}
        size={size}
        isPending={isPending}
        isError={isError}
        expanded={expanded}
        onExpandedChange={setExpanded}
        actions={actions}
      />

      {/* Footer: page size + pagination. Only lines are paginated; work unit and
          equipment rows belong to whichever line is expanded. */}
      <TablePagination
        page={page}
        size={size}
        meta={meta}
        onPageChange={setPage}
        onSizeChange={handleSizeChange}
      />

      <LineFormDialog open={lineOpen} onOpenChange={setLineOpen} item={lineItem} />
      <MachineFormDialog open={machineOpen} onOpenChange={setMachineOpen} target={machineTarget} />
      <EquipmentFormDialog
        open={equipmentOpen}
        onOpenChange={setEquipmentOpen}
        target={equipmentTarget}
      />
      <DeleteNodeDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export { LevelConfiguration };
