"use client";

import { SpanLoader } from "@/components/span-loader";
import { cn } from "@/lib/utils";

export function LoadingOverlay({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("fixed inset-0 z-[100] grid place-items-center bg-white/65 backdrop-blur-[1px]", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="grid place-items-center gap-3">
        <SpanLoader size="inline" />
        <p className="text-sm font-semibold text-[#5a173b]">{label}</p>
      </div>
    </div>
  );
}
