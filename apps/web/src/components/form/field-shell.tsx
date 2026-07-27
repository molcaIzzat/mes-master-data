import { Label } from "@/components/ui/label.js";

import type { ReactNode } from "react";

type FieldShellProps = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

// Label + control + validation message, so every field in a form dialog lines up
// the same way.
function FieldShell({ label, required, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { FieldShell };
export type { FieldShellProps };
