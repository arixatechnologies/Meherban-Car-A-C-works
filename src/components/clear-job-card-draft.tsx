"use client";

import { useEffect } from "react";

export function ClearJobCardDraft({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return null;
}
