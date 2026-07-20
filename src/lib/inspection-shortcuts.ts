import { inspectionItemNames } from "@/lib/constants";

export function resolveInspectionItemShortcut(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return value;

  const item = inspectionItemNames[Number(trimmed) - 1];
  return item ?? value;
}
