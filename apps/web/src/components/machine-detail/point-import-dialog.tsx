import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { PointFileError } from "@/lib/point-import.js";
import { extractError, extractIssues } from "@/lib/form.js";
import { Button } from "@/components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";

import type { ImportPointIssue, ImportPointResult } from "@/lib/types.js";

// Count points and other points are imported the same way -- pick a file, see
// the rejected cells, retry -- so one dialog serves both. Everything specific to
// a point kind arrives as a prop: its columns, its parser, its template and the
// mutation that posts it.
type PointImportMutation<TRow> = {
  mutateAsync: (vars: { workUnitId: number; rows: TRow[] }) => Promise<ImportPointResult>;
  isPending: boolean;
};

type PointImportDialogProps<TRow> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workUnitId: number;
  title: string;
  columns: readonly string[];
  templateFilename: string;
  templateCsv: () => string;
  parseFile: (file: File) => Promise<TRow[]>;
  importMutation: PointImportMutation<TRow>;
};

function downloadTemplate(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type Picked<TRow> = { name: string; rows: TRow[] };

type PointImportProps<TRow> = Omit<
  PointImportDialogProps<TRow>,
  "open" | "onOpenChange" | "title"
> & {
  onClose: () => void;
};

function PointImport<TRow>({
  workUnitId,
  columns,
  templateFilename,
  templateCsv,
  parseFile,
  importMutation,
  onClose,
}: PointImportProps<TRow>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked<TRow> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<ImportPointIssue[] | null>(null);
  const [result, setResult] = useState<ImportPointResult | null>(null);

  async function onPick(file: File | undefined) {
    setErrorMessage(null);
    setIssues(null);
    setResult(null);
    setPicked(null);
    if (!file) return;

    try {
      const rows = await parseFile(file);
      setPicked({ name: file.name, rows });
    } catch (err) {
      // A file this app cannot read as a table never reaches the API.
      setErrorMessage(
        err instanceof PointFileError
          ? err.message
          : `"${file.name}" could not be read. Make sure it is a valid .csv or .xlsx file.`,
      );
    }
  }

  async function onImport() {
    if (!picked) return;
    setErrorMessage(null);
    setIssues(null);

    try {
      setResult(await importMutation.mutateAsync({ workUnitId, rows: picked.rows }));
    } catch (err) {
      setErrorMessage(extractError(err, "Failed to import the file. Please try again."));
      setIssues(extractIssues(err) ?? null);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium">
            {result.created} of {result.total} {result.total === 1 ? "row" : "rows"} imported.
          </p>
          {result.skipped > 0 && (
            <p className="pt-1 text-muted-foreground">
              {result.skipped} already existed on this machine and{" "}
              {result.skipped === 1 ? "was" : "were"} left unchanged.
            </p>
          )}
        </div>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {issues && (
        <div className="max-h-64 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Row</TableHead>
                <TableHead className="w-36">Column</TableHead>
                <TableHead className="w-40">Value</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue, i) => (
                <TableRow key={`${issue.row}-${issue.column}-${i}`}>
                  <TableCell className="text-muted-foreground">{issue.row}</TableCell>
                  <TableCell>{issue.column}</TableCell>
                  <TableCell className="font-mono text-xs break-all">
                    {issue.value.trim() === "" ? "—" : issue.value}
                  </TableCell>
                  <TableCell className="text-destructive">{issue.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-md border border-dashed px-4 py-6 text-center">
        <FileSpreadsheet className="mx-auto size-6 text-muted-foreground" />
        {picked ? (
          <p className="pt-2 text-sm">
            <span className="font-medium">{picked.name}</span> — {picked.rows.length}{" "}
            {picked.rows.length === 1 ? "row" : "rows"} found
          </p>
        ) : (
          <p className="pt-2 text-sm text-muted-foreground">Choose a .csv or .xlsx file</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            // Reset so picking the same file again after a fix still fires.
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {picked ? "Choose another file" : "Choose file"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Columns: {columns.join(", ")}. Rows already on this machine are skipped, and if any row is
        invalid nothing is imported.
      </p>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="button"
          onClick={() => void onImport()}
          disabled={!picked || importMutation.isPending}
        >
          <Upload />
          {importMutation.isPending ? "Importing..." : "Import"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => downloadTemplate(templateFilename, templateCsv())}
        >
          <Download />
          Download template
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Discard
        </Button>
      </div>
    </div>
  );
}

function PointImportDialog<TRow>({
  open,
  onOpenChange,
  title,
  ...rest
}: PointImportDialogProps<TRow>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        {/* Unmounted on close so a previous file, error or result never carries
            over into the next import. */}
        {open && <PointImport {...rest} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export { PointImportDialog };
export type { PointImportMutation };
