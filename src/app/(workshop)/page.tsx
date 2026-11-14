import { BillingWorkspace, type DocumentType } from "@/components/billing-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: DocumentType; page?: string }>;
}) {
  return <BillingWorkspace searchParams={searchParams} />;
}
