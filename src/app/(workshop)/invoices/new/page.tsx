import { InvoiceForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ estimateId?: string; jobCardId?: string }>;
}) {
  const params = await searchParams;
  const [jobCards, estimates, selectedEstimate, setting] = await Promise.all([
    prisma.jobCard.findMany({
      include: {
        customer: true,
        vehicle: true,
        serviceObservations: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.estimate.findMany({ orderBy: { createdAt: "desc" } }),
    params.estimateId ? prisma.estimate.findUnique({ where: { id: params.estimateId }, include: { items: true } }) : null,
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  const selectedEstimateOption = selectedEstimate
    ? {
        id: selectedEstimate.id,
        estimateNumber: selectedEstimate.estimateNumber,
        jobCardId: selectedEstimate.jobCardId,
        totalAmount: selectedEstimate.totalAmount,
        advanceReceived: selectedEstimate.advanceReceived,
        items: selectedEstimate.items,
      }
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader title="New Invoice" />
      <InvoiceForm
        jobCards={jobCards}
        estimates={estimates}
        selectedEstimate={selectedEstimateOption}
        selectedJobCardId={params.jobCardId}
        setting={setting}
      />
    </div>
  );
}
