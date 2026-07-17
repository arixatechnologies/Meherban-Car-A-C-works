import { notFound } from "next/navigation";
import { JobCardForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditJobCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [jobCard, customers, vehicles, setting] = await Promise.all([
    prisma.jobCard.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        inspectionItems: { orderBy: { createdAt: "asc" } },
        serviceObservations: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { jobCards: { some: {} } },
          { estimates: { some: {} } },
          { invoices: { some: {} } },
          { payments: { some: {} } },
        ],
      },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where: {
        OR: [
          { jobCards: { some: {} } },
          { estimates: { some: {} } },
          { invoices: { some: {} } },
        ],
      },
      orderBy: { vehicleNumber: "asc" },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!jobCard) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${jobCard.jobCardNumber}`} />
      <JobCardForm
        jobCard={jobCard}
        customers={customers}
        vehicles={vehicles}
        setting={setting}
      />
    </div>
  );
}
