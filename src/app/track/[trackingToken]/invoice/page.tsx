import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { DataTable } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicInvoicePrintPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const jobCard = await prisma.jobCard.findUnique({
    where: { trackingToken },
    include: { customer: true, vehicle: true, invoices: { include: { items: true }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!jobCard?.invoices[0]) notFound();
  const invoice = jobCard.invoices[0];

  return (
    <main className="bg-slate-100 p-6 print:bg-white">
      <div className="print-page rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Meherban Car A/C Works</h1>
        <p className="mt-1 text-sm text-slate-600">Simple Invoice / Service Bill {invoice.invoiceNumber}</p>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <p><strong>Customer:</strong> {jobCard.customer.name}</p>
          <p><strong>Vehicle:</strong> {jobCard.vehicle.vehicleNumber}</p>
          <p><strong>Job Card:</strong> {jobCard.jobCardNumber}</p>
          <p><strong>Balance:</strong> {formatMoney(invoice.balanceAmount)}</p>
        </div>
        <div className="mt-6">
          <DataTable
            headers={["Description", "Category", "Qty", "Unit Price", "Amount"]}
            empty="No items."
            rows={invoice.items.map((item) => [
              item.description,
              item.category,
              item.quantity.toString(),
              formatMoney(item.unitPrice),
              formatMoney(item.amount),
            ])}
          />
        </div>
      </div>
      <div className="no-print mt-4 text-center"><PrintButton /></div>
    </main>
  );
}
