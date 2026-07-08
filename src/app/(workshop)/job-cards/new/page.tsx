import { JobCardForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewJobCardPage() {
  const [customers, vehicles, setting] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ orderBy: { vehicleNumber: "asc" } }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title="New Job Card" description="Customer intake, vehicle details, complaint, and workshop assignment." />
      <JobCardForm
        customers={customers}
        vehicles={vehicles}
        setting={setting}
      />
    </div>
  );
}
