import { notFound } from "next/navigation";
import { EstimateForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, jobCards, setting] = await Promise.all([
    prisma.estimate.findUnique({ where: { id }, include: { items: true } }),
    prisma.jobCard.findMany({
      include: {
        customer: true,
        vehicle: true,
        serviceObservations: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!estimate) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${estimate.estimateNumber}`} />
      <EstimateForm estimate={estimate} jobCards={jobCards} setting={setting} />
    </div>
  );
}
