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
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2",
        "bg-[#b63a58] text-white hover:bg-[#922642]",
        "disabled:cursor-not-allowed disabled:bg-[#eadce9] disabled:text-[#8d6373]",
      )}
    >
      {children}
    </button>
  );
}
