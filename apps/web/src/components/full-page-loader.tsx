import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils.js";

// Centered spinner shown while the auth state is being resolved.
function FullPageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-svh items-center justify-center", className)}>
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}

export { FullPageLoader };
