"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  confirmMessage = "Delete this record permanently?",
  disabled = false,
  disabledReason = "This action is not available.",
}: {
  children: ReactNode;
  confirmMessage?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      title={disabled ? disabledReason : "Delete"}
      onClick={(event) => {
        if (disabled || !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
        "bg-rose-600 text-white hover:bg-rose-700",
        "disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500",
      )}
    >
      {children}
    </button>
  );
}
