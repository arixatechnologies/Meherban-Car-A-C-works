import { EstimateForm } from "@/components/forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ jobCardId?: string }>;
}) {
  const selectedJobCardId = (await searchParams).jobCardId;
  const jobCards = await prisma.jobCard.findMany({
    include: { customer: true, vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="New Estimate" />
      <Card>
        <CardHeader title="Estimate details" />
        <CardBody>
          <EstimateForm jobCards={jobCards} selectedJobCardId={selectedJobCardId} />
        </CardBody>
      </Card>
    </div>
  );
}
