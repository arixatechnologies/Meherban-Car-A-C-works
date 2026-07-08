"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
    >
      Print
    </button>
  );
}
