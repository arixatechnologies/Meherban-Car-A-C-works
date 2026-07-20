"use client";

import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "@/components/loading-overlay";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        aria-label={pending ? "Saving" : undefined}
        className={cn(
          "inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
          variant === "primary" && "bg-[#5a173b] text-white hover:bg-[#42102e]",
          variant === "secondary" && "border border-[#e7c9c1] bg-[#fff8f2] text-[#4b1737] hover:bg-[#f4ded6]",
          variant === "danger" && "bg-[#b63a58] text-white hover:bg-[#922642]",
        )}
      >
        {pending ? "Saving..." : children}
      </button>

      {pending ? <LoadingOverlay label="Saving..." /> : null}
    </>
  );
}
