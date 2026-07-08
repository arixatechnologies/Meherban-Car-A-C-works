import { notFound } from "next/navigation";
import { EstimateForm } from "@/components/forms";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, jobCards] = await Promise.all([
    prisma.estimate.findUnique({ where: { id }, include: { items: true } }),
    prisma.jobCard.findMany({ include: { customer: true, vehicle: true }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!estimate) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${estimate.estimateNumber}`} />
      <Card>
        <CardHeader title="Estimate details" />
        <CardBody>
          <EstimateForm estimate={estimate} jobCards={jobCards} />
        </CardBody>
      </Card>
    </div>
  );
}
