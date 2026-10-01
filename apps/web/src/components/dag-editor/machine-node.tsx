import { Handle, NodeResizer, Position } from "@xyflow/react";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { EquipmentCard } from "@/components/dag-editor/equipment-card.js";
import { useDagEditor } from "@/components/dag-editor/dag-editor-context.js";

import type { NodeProps } from "@xyflow/react";
import type { MachineNode as MachineNodeType } from "@/lib/dag-editor.js";

const HANDLE_STYLE = { width: 12, height: 12, borderRadius: 3 };
const LINE_STYLE = { borderWidth: 2 };

// One machine on the canvas: its identity, the equipment it holds and how many
// count points hang off it. Resizable from any corner once selected; the gear
// opens the machine in the detail panel.
function MachineNode({ data, selected }: NodeProps<MachineNodeType>) {
  const { connectMode, selectMachine, selectEquipment, saveLayout } = useDagEditor();
  const { workUnit, equipment, countPointTotal } = data;

  const handleClass = cn(
    "size-3 border-2 border-background bg-primary transition-opacity",
    !connectMode && "opacity-0",
  );

  return (
    <>
      <NodeResizer
        minWidth={280}
        minHeight={240}
        isVisible={selected}
        // The default corner handles are 4px on a 1px line, which is not a target
        // anyone can hit; a drag near the corner moves the node instead.
        handleStyle={HANDLE_STYLE}
        lineStyle={LINE_STYLE}
        onResizeEnd={(_event, params) =>
          saveLayout(workUnit.id, {
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height,
          })
        }
      />
      <Handle type="target" position={Position.Left} className={handleClass} />
      <Handle type="source" position={Position.Right} className={handleClass} />

      <div
        className={cn(
          "flex h-full flex-col gap-3 rounded-md border bg-background p-4 shadow-sm",
          selected && "ring-2 ring-ring",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-xs text-muted-foreground">{workUnit.code}</span>
            <span className="truncate text-lg leading-tight font-semibold">{workUnit.name}</span>
            {/* No chip at all for a machine without a class. */}
            {workUnit.class && (
              <Badge variant="outline" className="w-fit">
                {workUnit.class.name}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="nodrag nopan shrink-0"
            aria-label={`Configure machine ${workUnit.name}`}
            onClick={() => selectMachine(workUnit.id)}
          >
            <Settings />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Equipment</span>
          {/* `nowheel` lets the list scroll instead of zooming the canvas. */}
          <div className="nowheel min-h-0 flex-1 overflow-y-auto rounded-md border border-dashed p-2">
            {equipment.length === 0 ? (
              <p className="flex h-full items-center justify-center py-6 text-sm text-muted-foreground">
                No Equipment
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {equipment.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    insideNode
                    onSelect={() => selectEquipment(workUnit.id, item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Badge variant="outline" className="w-fit">
          {countPointTotal === 0 ? "No Count Point" : `${countPointTotal} Count Point`}
        </Badge>
      </div>
    </>
  );
}

export { MachineNode };
