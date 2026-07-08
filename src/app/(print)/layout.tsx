import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PrintLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return children;
}
