import { BillingWorkspace } from "@/components/billing-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function JobCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  return <BillingWorkspace searchParams={searchParams} fixedType="job-card" formAction="/job-cards" />;
}
