"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e7c9c1] bg-[#fff8f2] px-4 text-sm font-bold text-[#4b1737] transition hover:bg-[#f4ded6]"
    >
      {copied ? "Copied" : "Copy message"}
    </button>
  );
}
