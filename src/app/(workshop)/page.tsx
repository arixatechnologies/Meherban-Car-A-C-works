import { BillingWorkspace, type DocumentType } from "@/components/billing-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: DocumentType }>;
}) {
  return <BillingWorkspace searchParams={searchParams} />;
}
