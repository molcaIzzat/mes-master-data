import { cn } from "@/lib/utils.js";

import type { ComponentProps } from "react";

// Text wordmark placeholder until a real molca logo asset is supplied. Swapping
// this for an <svg> later needs no changes at the call sites.
function MolcaLogo({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-2xl font-semibold lowercase tracking-tight text-foreground select-none",
        className,
      )}
      {...props}
    >
      molca
    </span>
  );
}

export { MolcaLogo };
