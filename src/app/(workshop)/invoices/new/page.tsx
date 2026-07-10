import { InvoiceForm } from "@/components/forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ estimateId?: string; jobCardId?: string }>;
}) {
  const params = await searchParams;
  const [jobCards, estimates, selectedEstimate] = await Promise.all([
    prisma.jobCard.findMany({ include: { customer: true, vehicle: true }, orderBy: { createdAt: "desc" } }),
    prisma.estimate.findMany({ orderBy: { createdAt: "desc" } }),
    params.estimateId ? prisma.estimate.findUnique({ where: { id: params.estimateId }, include: { items: true } }) : null,
  ]);

  const selected = selectedEstimate
    ? {
        id: selectedEstimate.id,
        estimateNumber: selectedEstimate.estimateNumber,
        jobCardId: selectedEstimate.jobCardId,
        totalAmount: selectedEstimate.totalAmount,
        items: selectedEstimate.items,
      }
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader title="New Invoice" />
      <Card>
        <CardHeader title="Service bill details" />
        <CardBody>
          <InvoiceForm
            jobCards={jobCards}
            estimates={estimates}
            selectedEstimate={selected}
            selectedJobCardId={params.jobCardId}
          />
        </CardBody>
      </Card>
    </div>
  );
}
