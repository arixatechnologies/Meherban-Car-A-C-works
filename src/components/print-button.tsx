"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#5a173b] px-4 py-2 text-sm font-bold text-white"
    >
      Print
    </button>
  );
}
