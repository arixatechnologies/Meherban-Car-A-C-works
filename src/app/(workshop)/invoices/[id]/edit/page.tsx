import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, jobCards, estimates, setting] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { items: true } }),
    prisma.jobCard.findMany({
      include: {
        customer: true,
        vehicle: true,
        serviceObservations: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.estimate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!invoice) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${invoice.invoiceNumber}`} />
      <InvoiceForm invoice={invoice} jobCards={jobCards} estimates={estimates} setting={setting} />
    </div>
  );
}
