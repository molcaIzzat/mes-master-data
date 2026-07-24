import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";

import type { DragEndEvent } from "@dnd-kit/core";
import type { UomListItem } from "@/lib/types.js";

// One packaging row's editable state. `factorToBase` lives here but is edited in
// the Conversion section; `length`/`width`/`height`/`vol` are constants at submit.
type PackageRow = {
  id: string;
  uomId: number | null;
  main: boolean;
  stdWeight: string;
  minWeight: string;
  maxWeight: string;
  factorToBase: string;
};

function newPackageRow(id: string, main = false): PackageRow {
  return {
    id,
    uomId: null,
    main,
    stdWeight: "",
    minWeight: "",
    maxWeight: "",
    factorToBase: "",
  };
}

// A weight input is invalid (once submitted) when it isn't a positive number.
function weightInvalid(value: string, submitted: boolean): boolean {
  return submitted && !(Number(value) > 0);
}

type WeightCellProps = {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
};

function WeightCell({ value, onChange, invalid }: WeightCellProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        className="pr-7"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        g
      </span>
    </div>
  );
}

type SortableRowProps = {
  row: PackageRow;
  index: number;
  uoms: UomListItem[];
  submitted: boolean;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<PackageRow>) => void;
  onRemove: (id: string) => void;
};

function SortableRow({
  row,
  index,
  uoms,
  submitted,
  canRemove,
  onChange,
  onRemove,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && "opacity-60")}>
      <TableCell className="w-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <span>{index + 1}</span>
        </div>
      </TableCell>
      <TableCell className="w-24 text-center">
        <RadioGroupItem value={row.id} aria-label={`Set package ${index + 1} as main unit`} />
      </TableCell>
      <TableCell className="min-w-40">
        <Select
          value={row.uomId ? String(row.uomId) : undefined}
          onValueChange={(v) => onChange(row.id, { uomId: Number(v) })}
        >
          <SelectTrigger aria-invalid={submitted && row.uomId == null} className="w-full">
            <SelectValue placeholder="Select unit..." />
          </SelectTrigger>
          <SelectContent>
            {uoms.map((uom) => (
              <SelectItem key={uom.id} value={String(uom.id)}>
                {uom.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-32">
        <WeightCell
          value={row.stdWeight}
          onChange={(v) => onChange(row.id, { stdWeight: v })}
          invalid={weightInvalid(row.stdWeight, submitted)}
        />
      </TableCell>
      <TableCell className="min-w-32">
        <WeightCell
          value={row.minWeight}
          onChange={(v) => onChange(row.id, { minWeight: v })}
          invalid={weightInvalid(row.minWeight, submitted)}
        />
      </TableCell>
      <TableCell className="min-w-32">
        <WeightCell
          value={row.maxWeight}
          onChange={(v) => onChange(row.id, { maxWeight: v })}
          invalid={weightInvalid(row.maxWeight, submitted)}
        />
      </TableCell>
      <TableCell className="w-12">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          aria-label="Remove package"
          disabled={!canRemove}
          onClick={() => onRemove(row.id)}
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

type PackageTableProps = {
  rows: PackageRow[];
  uoms: UomListItem[];
  submitted: boolean;
  onChange: (id: string, patch: Partial<PackageRow>) => void;
  onSetMain: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (rows: PackageRow[]) => void;
  onAdd: () => void;
};

function PackageTable({
  rows,
  uoms,
  submitted,
  onChange,
  onSetMain,
  onRemove,
  onReorder,
  onAdd,
}: PackageTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const mainId = rows.find((r) => r.main)?.id ?? "";

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(rows, oldIndex, newIndex));
  }

  return (
    <div className="rounded-md border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <RadioGroup value={mainId} onValueChange={onSetMain} className="contents">
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead className="w-24 text-center">Main Unit</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Min Weight</TableHead>
                  <TableHead>Max Weight</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    index={index}
                    uoms={uoms}
                    submitted={submitted}
                    canRemove={rows.length > 1}
                    onChange={onChange}
                    onRemove={onRemove}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </RadioGroup>
      </DndContext>

      <div className="border-t p-2">
        <Button type="button" variant="ghost" className="w-full" onClick={onAdd}>
          <Plus />
          Add Packaging
        </Button>
      </div>
    </div>
  );
}

export { newPackageRow, PackageTable };
export type { PackageRow };
