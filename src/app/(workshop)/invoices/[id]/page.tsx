import { CreditCard, Edit, FileDown, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { createWhatsAppLink, invoiceGeneratedBody } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      jobCard: true,
    },
  });

  if (!invoice) notFound();

  const message = invoiceGeneratedBody({
    customerId: invoice.customerId,
    jobCardId: invoice.jobCardId,
    invoiceId: invoice.id,
    customerName: invoice.customer.name,
    mobileNumber: invoice.customer.whatsapp || invoice.customer.mobile,
    vehicleNumber: invoice.vehicle.vehicleNumber,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balanceAmount: invoice.balanceAmount,
    trackingToken: invoice.jobCard.trackingToken,
  });
  const externalButtonClass = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
  );

  return (
    <div className="grid gap-4">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Button href={`/payments/new?invoiceId=${invoice.id}`}>
          <CreditCard className="h-4 w-4" />
          Record Payment
        </Button>
        <Button href={`/invoices/${invoice.id}/print`} variant="secondary">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <a
          href={createWhatsAppLink(invoice.customer.whatsapp || invoice.customer.mobile, message)}
          target="_blank"
          rel="noreferrer"
          className={externalButtonClass}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Share
        </a>
        <Button href={`/invoices/${invoice.id}/edit`} variant="secondary">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <InvoicePreview id={invoice.id} />
    </div>
  );
}
