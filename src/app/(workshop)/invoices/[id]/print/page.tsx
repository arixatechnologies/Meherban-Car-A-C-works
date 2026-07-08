import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { DataTable } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, vehicle: true, jobCard: true, items: true, payments: { orderBy: { paymentDate: "desc" }, take: 1 } },
    }),
    prisma.workshopSetting.findUnique({ where: { singletonKey: "default" } }),
  ]);

  if (!invoice) notFound();

  const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <main className="bg-slate-100 p-6 print:bg-white">
      <div className="print-page rounded-lg bg-white p-8 shadow-sm">
        <div className="flex justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{setting?.workshopName ?? "Meherban Car A/C Works"}</h1>
            <p className="text-sm text-slate-600">{setting?.tagline}</p>
            <p className="mt-2 text-sm text-slate-600">{setting?.address}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase text-slate-500">Simple Invoice / Service Bill</p>
            <p className="text-xl font-bold text-slate-950">{invoice.invoiceNumber}</p>
            <p className="text-sm text-slate-600">{formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-950">Customer Details</h2>
            <p className="mt-2 text-sm">{invoice.customer.name}</p>
            <p className="text-sm">{invoice.customer.mobile}</p>
            <p className="text-sm">{invoice.customer.address}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-950">Vehicle Details</h2>
            <p className="mt-2 text-sm">{invoice.vehicle.vehicleNumber}</p>
            <p className="text-sm">{invoice.vehicle.brand} {invoice.vehicle.model}</p>
            <p className="text-sm">Job card: {invoice.jobCard.jobCardNumber}</p>
          </div>
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
        <div className="ml-auto mt-6 grid w-full max-w-sm gap-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="flex justify-between"><span>Discount</span><strong>{formatMoney(invoice.discount)}</strong></div>
          <div className="flex justify-between text-lg"><span>Grand Total</span><strong>{formatMoney(invoice.totalAmount)}</strong></div>
          <div className="flex justify-between"><span>Paid Amount</span><strong>{formatMoney(invoice.paidAmount)}</strong></div>
          <div className="flex justify-between"><span>Balance Amount</span><strong>{formatMoney(invoice.balanceAmount)}</strong></div>
          <div className="flex justify-between"><span>Payment Mode</span><strong>{invoice.payments[0]?.mode ?? "-"}</strong></div>
        </div>
        <p className="mt-6 text-sm"><strong>Notes:</strong> {invoice.notes ?? "-"}</p>
        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div className="border-t border-slate-400 pt-3">Customer signature</div>
          <div className="border-t border-slate-400 pt-3 text-right">Authorized signature</div>
        </div>
        <p className="mt-8 text-xs text-slate-500">{setting?.invoiceFooterNote}</p>
      </div>
      <div className="no-print mt-4 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
